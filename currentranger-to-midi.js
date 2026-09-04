import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { Client } from 'node-osc';
import easymidi from 'easymidi'
import midinote from 'midi-note'
import { writeFile } from 'fs';
import { stringify } from 'csv-stringify'
import readline from 'readline'



// https://serialport.io/docs/bin-list
// Log
const logFilePath = `./log/${(new Date().toISOString())}.csv`;
const log = [];
const loggingInterval = 5000; // every 5 seconds
let currentMicroAmps = 0;
let allCurrentMicroAmps = {}
let dataAsNumber = 0

// Range (in microAmps)
let minRange = null;
let maxRange = null;
let rangeSpread = 3;

// Rate of notes sent
let noteSentEveryNValues = 100


// CurrentRangers
let currentRangersFound = []


// OSC
const oscClient = new Client('127.0.0.1', 3333);

// MIDI
console.log('Midi outputs:')
easymidi.getOutputs().forEach(output => console.log(output));
const algaeOutput = new easymidi.Output('IAC-besturingsbestand Algae'); //new easymidi.Output('loopMIDI Port');
console.log('')


let nonCurrentRangerDevicesCount = 0;

console.log('Searching for CurrentRangers...')
SerialPort.list().then(ports => {
    // Find all CurrentRangers
    ports.forEach((p, portIndex) => {
        if (p.manufacturer !== 'LowPowerLab LLC') {
            nonCurrentRangerDevicesCount++
        }
    })

    ports.forEach((p, portIndex) => {
        console.log(p.path)
        if (p.manufacturer === 'LowPowerLab LLC' || p.path.includes('COM')) {
            console.log(`Found CurrentRanger on ${p.path}!`);
            currentRangersFound.push(p)
        }
    });

    console.log(currentRangersFound)

    if (currentRangersFound.length == 0) {
        console.log('No CurrentRanger found!');
        return;
    } else {
        console.log(`Found ${currentRangersFound.length} CurrentRangers`)
    }

    currentRangersFound.forEach((p, _rangerI) => {
        const rangerI = p.serialNumber.slice(0,4)
        console.log(rangerI)


        // Serial setup
        const port = new SerialPort({
            path: p.path, //'/dev/cu.usbmodem1101'
            baudRate: 9600,
        })

        const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));


        port.on("open", () => {
            console.log(`Serial port ${p.path} of ranger-${rangerI} open`);
        });
        

        // Read incoming data
        parser.on('data', data => {
            i++;
    
            if (i % noteSentEveryNValues === 0) {
                // dataAsNumber = Number(new Number(data / 1000).toFixed(2));
                // dataAsNumber = new Number(data / 1000);
                // dataAsNumber = new Number(data);
                // dataAsNumber = new Number(data * 1_000_000).toFixed(4);
                dataAsNumber = new Number(data).toFixed(4);


                // console.log(new Number(data * 1000))

                // console.log(currentMicroAmps)
                // currentMicroAmps = dataAsNumber;
                // allCurrentMicroAmps[p.path] = {
                //     rangerI: `ranger-${rangerI}`,
                //     microAmps: data
                // };

                // log.push({
                //     timestamp: new Date().toISOString(),
                //     path: p.path,
                //     rangerI: `ranger-${rangerI}`,
                //     microAmps: dataAsNumber
                // });
    
                // adjustRange();
    
                // // Note
                // // newNote = Math.round(map(dataAsNumber, minRange, maxRange, 0, 128));
                // newNote = map(dataAsNumber, minRange, maxRange, 0, 128);
    
                // algaeOutput.send('noteon', {
                //     note: newNote,
                //     velocity: 127,
                //     channel: portIndex
                // });
    
                // // Turn off last note
                // algaeOutput.send('noteoff', {
                //     note: lastNote,
                //     velocity: 127,
                //     channel: portIndex
                // });
    
                // lastNote = newNote;
                
    
                oscClient.send(`/ranger-${rangerI}`, dataAsNumber)
                console.log(p.path, `/ranger-${rangerI}`, dataAsNumber)
            }
        });


        process.stdin.on('keypress', (chunk, key) => {
            // press 'u' to toggle logging 
            if (key && key.name == 'u') {
                console.log('u pressed');
                port.write('u');
            }
            if (key && key.name == 'f') {
                console.log('u pressed');
                port.write('f');
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
    })


    // Keyboard controls
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

   


    


    // Interval for logging the data and adjusting the range
    // setInterval(async () => {
    //     logData();
    // }, loggingInterval);

    

    let lastNote = 0;
    let newNote = 0;
    let i = 0;

    // Printing interval
    // setInterval(() => {
    //     console.clear()
    //     console.log('Current value:', dataAsNumber) // as milliAmps
    //     console.log('Current value:', dataAsNumber) // as milliAmps
    //     console.log(`sent note:`, newNote, midinote(newNote));
    //     console.log('Range:', minRange, '-', currentMicroAmps, '-', maxRange);
    //     console.log('Note sent every', noteSentEveryNValues, 'values. Press up or down to change.');
    //     console.log(`Press u to start/stop the currentranger sending data.`);
    //     console.log(``);
    //     console.log(`Connected CurrentRangers: [${currentRangersFound.length}]`);
    //     currentRangersFound.forEach(c => {
    //         console.log(c.path)
    //     }) 
    // }, 10)
});



function logData() {
    console.log(`Current milliAmps: ${currentMicroAmps}`);

    stringify(log, {
        columns: ['timestamp', 'path', 'rangerI', 'microAmps'],
        header: true
    }, (err, data) => {
        // console.log(err, data)
        writeFile(logFilePath, data, () => {
            console.log('logged', data);
        });
    });
}

function adjustRange() {
    // If no range is set, set the range
    // If the value goes out of bounds, reset it
    if (minRange === null || maxRange === null || currentMicroAmps < minRange || currentMicroAmps > maxRange) {
        minRange = currentMicroAmps - rangeSpread;
        maxRange = currentMicroAmps + rangeSpread;
        console.log(`New range: ${minRange} - ${maxRange}`);
    }
}


/**
 * Utils
 */
function map(value, x1, y1, x2, y2) {
    return (value - x1) * (y2 - x2) / (y1 - x1) + x2;
}