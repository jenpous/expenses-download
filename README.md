# expenses-download

## Purpose

Expense reports are being archived in pdf form. This is done at the time of the export.
Export files list the expense reports which life cycle is complete. They reference the pdf file by providing a download URI.

The **Expense Download** is a sample client application that uses this API.

## License

See the enclosed LICENSE file.

In a nutshell :

  This application is provided "as-is", with no maintenance nor support other than this embedded documentation.

  Any person obtaining a copy of this software is free to use it directly or to modify it to better fit their own requirements.

## Installing the application

1. The target environment requires Node.js version "4.4.7 LTS" or later. This can be obtained from nodejs.org .
2. Get the files **pdfDownload.<span/>js** and **packages.json** into a folder
3. Open a command line, get to this folder and type: `npm install`

Once successful, the application is ready to be used !

## Using the application

The application will walk through the export file and will download all the pdf files into the root of the output folder. The output file names are deduced from the pdf urls by removing the scheme and replacing special characters by dashes.

### Running the application

You may want to adjust the **// Configuration** section at the beginning of **index<span></span>.js**. 

<div>
<li>Make sure you add the correct separator as <code>csvSeparator</code> </li>
<li>The <code>authToken</code> needs to contain the token generated from the KDS Admin Suite for the export user. It needs to be stored securely.</li>
<li>Make sure you add the correct <code>outputDirectory</code> in the form <code>'{REPLACEWITHYOURDIR}/output'</code>. All of the downloaded and merged Files and will be saved here.</li>
<li>Make sure you specify your <code>expenseFilePath</code>.</li>
<li>As a last step, make sure you specify the correct column names (without spaces) <code>expenseIdCol, archiveURLCol, receiptURLCol</code> of your expense.csv.</li>
</div>

The command line to run the application from the application folder should be constructed as follows:
```
node index.js
```

The Expense Report **{Export File}** contains urls of the pdfs that will be downloaded into the root of the <code>outputDirectory</code>. If it is not empty, the tool will only download the missing ones.

### Error management / Resume

If any error occurred during the processing, the process should be re-launched with the exact same command line.
Files already present in the output directory won't be downloaded again.