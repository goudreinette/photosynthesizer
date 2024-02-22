import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { Client } from 'node-osc';
import easymidi from 'easymidi'
import midinote from 'midi-note'
import {writeFile} from 'fs';
import {stringify} from 'csv-stringify'
import keyboardjs from 'keyboardjs';
import readline from 'readline'


// Log
const logFilePath = `./log/${(new Date().toISOString())}.csv`;
const log = [];
const loggingInterval = 1000 * 5; // every 5 seconds
let currentMicroAmps = 0;

// Range (in microAmps)
let minRange = null;
let maxRange = null;
let rangeSpread = 3;




SerialPort.list().then(ports => {
    // Find the serial port
    let serialPortPath = '';

    ports.forEach(port => {
        if (port.manufacturer === 'LowPowerLab LLC') {
            console.log(`Found CurrentRanger on ${port.path}!`);
            serialPortPath = port.path;
        }
    });

    if (serialPortPath === '') {
        console.log('No CurrentRanger found!');
        return;
    }


    // Serial setup
    const port = new SerialPort({
        path: serialPortPath, //'/dev/cu.usbmodem1101'
        baudRate: 9600,
    })

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    
    // Keyboard, press 'u' to toggle logging 
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    process.stdin.on('keypress', (chunk, key) => {
        if (key && key.name == 'u') {
            console.log('u pressed');
            port.write('u');
        }
        if (key && key.name == 'c') {
            process.exit();
        }
    });

    // const client = new Client('127.0.0.1', 3333);

    // MIDI
    easymidi.getOutputs().forEach(output => console.log(output));
    const algaeOutput = new easymidi.Output('IAC-besturingsbestand Algae');


    // Interval for logging the data and adjusting the range
    setInterval(async () => {
        logData();
        adjustRange();
    }, loggingInterval);

    // Read the port data
    port.on("open", () => {
        console.log('serial port open');
    });

    let lastNote = 0;
    let i = 0;

    parser.on('data', data => {
        i++;
        
        if (i % 90 === 0) {
            // console.clear()

            const dataAsNumber = Number(new Number(data / 1000).toFixed(2));
            currentMicroAmps = dataAsNumber;

            if (minRange === null || maxRange === null) {
                adjustRange();
            }

            console.log(dataAsNumber) // as milliAmps

            let newNote = Math.round(map(dataAsNumber, minRange, maxRange, 24, 96));

            algaeOutput.send('noteon', {
                note: newNote,
                velocity: 127,
            });
            
            // Turn off last note
            algaeOutput.send('noteoff', {
                note: lastNote,
                velocity: 127,
            });

            lastNote = newNote;

            // client.send('/nA', data)
            // console.log(data);
            console.log(`sent note:`, newNote, midinote(newNote));
        }    
    });

});



function logData() {
    console.log(`Current milliAmps: ${currentMicroAmps}`);
    log.push({
        timestamp: new Date().toISOString(), 
        microAmps: currentMicroAmps.toFixed(2)
    });

    stringify(log, {
        columns: ['timestamp', 'microAmps'],
        header: true
    }, function (err, data){
        // console.log(err, data)
        writeFile(logFilePath, data, () => {
            console.log('logged', data);
        });
    });
}

function adjustRange() {
    // Adjust the range
    minRange = currentMicroAmps - rangeSpread;
    maxRange = currentMicroAmps + rangeSpread;
    console.log(`New range: ${minRange} - ${maxRange}`);
}


/**
 * Utils
 */
function map(value, x1, y1, x2, y2) {
    return (value - x1) * (y2 - x2) / (y1 - x1) + x2;
}