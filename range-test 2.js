import readline from 'readline'


let currentMicroAmps = 100;
let minRange = null;
let maxRange = null;
let rangeSpread = 3;



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
        currentMicroAmps += 1
    }

    if (key && key.name == 'down') {
        currentMicroAmps -= 1
    }
});



setInterval(() => {
    adjustRange();

    console.log(`Range: ${minRange} - ${currentMicroAmps} - ${maxRange}`);

}, 10)




function adjustRange() {
    // If no range is set, set the range
    // If it goes out of bounds, reset it too
    if (minRange === null || maxRange === null || currentMicroAmps < minRange || currentMicroAmps > maxRange) {
        minRange = currentMicroAmps - rangeSpread;
        maxRange = currentMicroAmps + rangeSpread;
        console.log(`New range: ${minRange} - ${maxRange}`);
    }
}


