// Dependencies
const csvToJson = require('convert-csv-to-json');
const PDFMerger = require('pdf-merger-js');
const _ = require('lodash');
const filePix = require('filepix');
const fs = require('fs');
const path = require('path');
const https = require('https');
const process = require('process');

// Configuration
// Todo: Please adjust
const csvSeparator = ',';
const authToken = '';
const outputDirectory = '';
const expenseFilePath = '';
const expenseIdCol = 'Code';
const archiveURLCol = 'ArchiveURL';
const receiptURLCol = 'Receipt';

//const requestTimeout = 180000;
//const proxy = "127.0.0.1:8888";
https.globalAgent.maxSockets = 20;

// Initializations
//const useProxy = typeof proxy !== 'undefined';
//const proxyDetails = useProxy ? proxy.split(':') : [];


try {
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    process.chdir(outputDirectory)
} catch (err) {
    console.error(err);
}

let receiptsToConvert = [];
let receiptsPdf = [];
let exportURLs = [];
let expenseFileName = '';
let getJsonFromCsv = csvToJson
    .fieldDelimiter(csvSeparator)
    .supportQuotedField(active = true)
    .formatValueByType()
    .getJsonFromCsv(expenseFilePath);

const groupedExpenses = _.groupBy(getJsonFromCsv.map(row => {
    return {
        code: row[expenseIdCol],
        archiveUrl: row[archiveURLCol],
        receipt: row[receiptURLCol]
    }
}), 'code');

const fileExists = (filePath) => {
    try {
        return fs.statSync(filePath).isFile();
    } catch (err) {
        return false;
    }
}

const createFileName = (urlToParse) => {
    return new URL(urlToParse).pathname.split('/').join('-').slice(1);
}

const downloadFileFromUrl = async (receiptUrl) => {
    const parsedUrl = new URL(receiptUrl);

    let originalReceiptFileName = parsedUrl.pathname.split('/').join('-').slice(1);
    let originalReceiptFilePath = path.join(outputDirectory, originalReceiptFileName);

    if (fileExists(originalReceiptFilePath)) {
        console.log(`File exists: Download skipped for ${originalReceiptFileName}`);
        return;
    }

    return new Promise((resolve, reject) => {

        https.get({
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            //port: useProxy ? proxyDetails[1] : parsedUrl.port,
            path: parsedUrl.pathname,
            headers: {
                //'Host': parsedUrl.hostname,
                'Authorization': 'Bearer ' + authToken
            }
        }, (response) => {
            if (response.statusCode !== 200) {
                reject(`Failed to download: ${response.statusCode}`);
                return;
            }

            const file = fs.createWriteStream(originalReceiptFilePath);
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log("FILE CLOSED")
                resolve();

            });
        }).on('error', (err) => {
            fs.unlink(originalReceiptFilePath, () => reject(err));
        });
    });
}

const prepareAndDownloadFiles = async () => {
    for (const [expenseId] of Object.entries(groupedExpenses)) {
        receiptsToConvert = [];
        receiptsPdf = [];
        expenseFileName = '';

        for (const [i, elem] of (Object.entries(groupedExpenses[expenseId]))) {

            await downloadFileFromUrl(elem.archiveUrl);
            expenseFileName = createFileName(elem.archiveUrl);

            if (elem.receipt && elem.receipt !== '"') {

                await downloadFileFromUrl(elem.receipt);
                if (!elem.receipt.includes('.pdf') && elem.receipt !== '"') {
                    receiptsToConvert.push(createFileName(elem.receipt))
                } else if (elem.receipt.includes('.pdf')) {
                    receiptsPdf.push(createFileName(elem.receipt))
                }
            }
        }

        let uniqueReceiptsPdf = [...new Set(receiptsPdf)];
        let uniqueReceiptsToConvert = [...new Set(receiptsToConvert)];

        exportURLs.push({
            'expenseId': expenseId,
            'expenseReport': expenseFileName,
            'receiptsToConvert': uniqueReceiptsToConvert,
            'receiptsPdf': uniqueReceiptsPdf
        })
    }
}

const convertToPDF = async () => {
    let pages;
    let output;
    for (let i = 0; i < exportURLs.length; i++) {
        const convertedReceiptsFileName = `${exportURLs[i].expenseId}-receipts.pdf`
        if (exportURLs[i].receiptsToConvert.length > 0) {

            await filePix.img2PDF(
                pages = exportURLs[i].receiptsToConvert,
                output = convertedReceiptsFileName);
        }
        console.log("Converting files successful")
    }
}

const mergePDFs = async (expenseFileName, expenseId, convertedReceipts, receipts) => {
    const merger = new PDFMerger();
    try {
        await merger.add(expenseFileName);
        await receipts.forEach((pdf) => {
            merger.add(`${pdf}`)
        })
        if (convertedReceipts.length > 0) {
            await merger.add(`${expenseId}-receipts.pdf`);
        }
        await merger.save(`EXPENSE-REPORT-${expenseId}-plus-${receipts.length + convertedReceipts.length}-receipts.pdf`);

        console.log("Merge successful")
    } catch (e) {
        console.log(e)
    }
}

prepareAndDownloadFiles()
    .then(() => {
        convertToPDF()
            .then(() => {
                for (let i = 0; i < exportURLs.length; i++) {
                    mergePDFs(exportURLs[i].expenseReport, exportURLs[i].expenseId, exportURLs[i].receiptsToConvert, exportURLs[i].receiptsPdf)
                        .then(() => console.log("SUCCESS"));
                }
            })
    });