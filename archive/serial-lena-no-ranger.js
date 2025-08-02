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
const loggingInterval = 1000 * 20; // every 20 seconds
let currentMicroAmps = 0;

// Range (in microAmps)
let minRange = null;
let maxRange = null;
let rangeSpread = 3;
const rangeInterval = 1000 * 60


let noteSentEveryNValues = 90


// Keyboard
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (chunk, key) => {
    // press 'u' to toggle logging 
    if (key && key.name == 'u') {
        console.log('u pressed');
        port.write('u');
    }

    // c to exit
    if (key && key.name == 'c') {
        process.exit();
    }

    if (key && key.name == 'up') {
        noteSentEveryNValues += 20
    }

    if (key && key.name == 'down') {
        noteSentEveryNValues -= 20
    }
});

setInterval(() => {
    console.clear()
    console.log(`Range: ${minRange} - ${currentMicroAmps} - ${maxRange}`);
    console.log(`Note sent every ${noteSentEveryNValues} values. Press up or down to change.`);
}, 10)



    // const client = new Client('127.0.0.1', 3333);




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
    // If no range is set, set the range
    if (minRange === null || maxRange === null) {
        minRange = currentMicroAmps - rangeSpread;
        maxRange = currentMicroAmps + rangeSpread;
        console.log(`Initial range: ${minRange} - ${maxRange}`);
        return;
    }

    // Adjust the range
    if (currentMicroAmps < minRange) {
        minRange--;
        maxRange--;
        console.log(`New range: ${minRange} - ${maxRange}`);
    }
    if (currentMicroAmps > maxRange) {
        minRange++;
        maxRange++;
        console.log(`New range: ${minRange} - ${maxRange}`);
    }

}


/**
 * Utils
 */
function map(value, x1, y1, x2, y2) {
    return (value - x1) * (y2 - x2) / (y1 - x1) + x2;
}