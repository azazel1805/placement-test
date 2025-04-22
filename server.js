const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
// Render typically sets the PORT environment variable
const PORT = process.env.PORT || 3000;
const RESULTS_FILE = path.join(__dirname, 'results.csv'); // Store CSV in the project root

// --- Middleware ---
// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies (like from simple forms, though we use JSON)
app.use(express.urlencoded({ extended: true }));
// Serve static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Initialize Results File ---
// Ensures the CSV file exists and has the correct headers upon server start.
const initializeResultsFile = () => {
    const headers = "Timestamp,FirstName,LastName,Score,TotalQuestions,AnswersJSON\n";
    try {
        // Check if the file exists
        if (!fs.existsSync(RESULTS_FILE)) {
            // If not, create it with headers
            fs.writeFileSync(RESULTS_FILE, headers, 'utf8');
            console.log(`Created results file with headers: ${RESULTS_FILE}`);
        } else {
            // Optional: Check if existing file has headers (might be overkill)
            // const content = fs.readFileSync(RESULTS_FILE, 'utf8');
            // if (!content.startsWith("Timestamp")) {
            //     fs.writeFileSync(RESULTS_FILE, headers, 'utf8'); // Overwrite if needed
            //     console.log(`Headers added to existing results file: ${RESULTS_FILE}`);
            // }
            console.log(`Results file already exists: ${RESULTS_FILE}`);
        }
    } catch (err) {
        // Log error if file system operations fail
        console.error("Error initializing results file:", err);
        // Consider exiting if file write is critical and fails
        // process.exit(1);
    }
};

// Run the initialization function when the server starts
initializeResultsFile();

// --- Route: Handle Test Submission (POST /submit) ---
app.post('/submit', (req, res) => {
    console.log('Received submission data via POST /submit'); // Log reception

    // Destructure data from the request body
    const { firstName, lastName, score, totalQuestions, timestamp, answers } = req.body;

    // Basic Validation: Check if essential data is present
    if (firstName === undefined || lastName === undefined || score === undefined || totalQuestions === undefined || timestamp === undefined || answers === undefined) {
        console.error('Invalid submission data received:', req.body);
        return res.status(400).send('Bad Request: Missing required submission fields.');
    }

    // Basic Sanitization: Remove commas from names to prevent CSV corruption
    const safeFirstName = String(firstName).replace(/,/g, '');
    const safeLastName = String(lastName).replace(/,/g, '');

    // Prepare Answers for CSV: Convert the answers object to a JSON string.
    // Replace internal commas with semicolons to avoid breaking the main CSV structure if someone opens it carelessly.
    // Enclose the JSON string in double quotes ("") to handle potential commas within the JSON itself correctly in CSV format.
    let answersJsonString = '';
    try {
        answersJsonString = JSON.stringify(answers);
    } catch (jsonError) {
        console.error("Error stringifying answers object:", jsonError);
        // Decide how to handle: save anyway with empty answers, or return error?
        answersJsonString = '{}'; // Save an empty object if stringify fails
        // return res.status(500).send('Internal Server Error: Could not process answers data.');
    }
    // No need to replace commas within the JSON string if it's properly quoted for CSV.

    // Format the data as a CSV line
    // Note: The timestamp should already be in ISO format from the frontend.
    const csvLine = `${timestamp},${safeFirstName},${safeLastName},${score},${totalQuestions},"${answersJsonString}"\n`;

    // Append the formatted line to the results file
    fs.appendFile(RESULTS_FILE, csvLine, 'utf8', (err) => {
        if (err) {
            console.error("Error appending data to results.csv:", err);
            // Send an internal server error response to the client
            return res.status(500).send('Internal Server Error: Could not save results.');
        }
        // Log success and send a success response to the client
        console.log(`Results saved successfully for: ${safeFirstName} ${safeLastName}`);
        res.status(200).send('Submission received and results saved successfully.');
    });
});

// --- Route: Download Results (GET /download-results) ---
app.get('/download-results', (req, res) => {
    console.log('Request received for GET /download-results');

    // !!! --- SECURITY WARNING --- !!!
    // This download route is currently UNPROTECTED. Anyone knowing the URL can download all results.
    // In a real application, you MUST implement authentication and authorization here.
    // Examples: Check if user is logged in as admin, require a secret key/password query parameter, etc.
    // const apiKey = req.query.key; // Example: Check for ?key=yourSecretPassword
    // if (apiKey !== 'yourSecretPassword') {
    //     console.warn('Unauthorized attempt to download results.');
    //     return res.status(403).send('Forbidden: Access denied.');
    // }
    // !!! --- END SECURITY WARNING --- !!!


    // Check if the results file actually exists
    if (fs.existsSync(RESULTS_FILE)) {
        try {
            // Set HTTP headers to tell the browser to download the file
            res.setHeader('Content-Disposition', `attachment; filename="placement-test-results-${Date.now()}.csv"`); // Suggest a filename with timestamp
            res.setHeader('Content-Type', 'text/csv'); // Set the content type

            // Create a read stream from the file
            const fileStream = fs.createReadStream(RESULTS_FILE);

            // Pipe the file stream directly to the response stream (efficient for large files)
            fileStream.pipe(res);

            // Handle potential errors during streaming
            fileStream.on('error', (streamErr) => {
                console.error('Error streaming results file:', streamErr);
                // Avoid sending another response if headers already sent
                if (!res.headersSent) {
                    res.status(500).send('Internal Server Error: Error reading results file.');
                }
            });

            console.log(`Streaming results file for download: ${RESULTS_FILE}`);

        } catch (err) {
             console.error('Error setting up download stream:', err);
             if (!res.headersSent) {
                 res.status(500).send('Internal Server Error: Could not prepare file for download.');
             }
        }
    } else {
        // If the file doesn't exist, send a 404 Not Found response
        console.log('Results file not found, cannot initiate download.');
        res.status(404).send('Not Found: Results file does not exist. No results have been submitted yet, or the file may have been lost (e.g., due to ephemeral storage).');
    }
});


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Access the test at: http://localhost:${PORT}`); // Useful for local testing
    console.log(`Download results (locally) via: http://localhost:${PORT}/download-results`); // Adjust URL if deployed
});