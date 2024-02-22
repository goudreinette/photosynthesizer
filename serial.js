import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { Client } from 'node-osc';
import easymidi from 'easymidi'
import midinote from 'midi-note'
import {writeFile} from 'fs';
import {stringify} from 'csv-stringify'


// Log
const logFilePath = `./log/${(new Date().toISOString())}.csv`;
const log = [];
const loggingInterval = 1000 * 5;
let currentMicroAmps = 0;

// Range (in microAmps)
const minRange = 94;
const maxRange = 100000;



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


    // Create a port
    const port = new SerialPort({
        path: serialPortPath, //'/dev/cu.usbmodem1101'
        baudRate: 9600,
    })

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    // const client = new Client('127.0.0.1', 3333);

    easymidi.getOutputs().forEach(output => console.log(output));

    const algaeOutput = new easymidi.Output('IAC-besturingsbestand Algae');

    // Interval for logging the data
    setInterval(async () => {
        console.log(`Current milliAmps: ${currentMicroAmps}`);
        log.push({
            timestamp: new Date().toISOString(), 
            microAmps: currentMicroAmps.toFixed(2)
        });


        stringify(log, {
            columns: ['timestamp', 'microAmps'],
            header: true
        }, function(err, data){
            // console.log(err, data)
            writeFile(logFilePath, data, () => {
                console.log('logged', data);
            });
        });

        
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

            const dataAsNumber = new Number(data / 1000);
            currentMicroAmps = dataAsNumber;

            // console.log(dataAsNumber) // as milliAmps

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
            console.log(data);
            console.log(`sent note:`, newNote, midinote(newNote));
        }    
    });

});




/**
 * Utils
 */
function map(value, x1, y1, x2, y2) {
    return (value - x1) * (y2 - x2) / (y1 - x1) + x2;
}