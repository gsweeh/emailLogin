const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs').promises; // Using promises version of fs for async file reading
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

let emails = [];
let currentIndex = 0;

// Function to generate random text with 7 alphabetic characters without commas
// function generateRandomText() {
//     const alphabets = 'abcdefghijklmnopqrstuvwxyz';
//     let text = '';
//     for (let i = 0; i < 7; i++) {
//         text += alphabets.charAt(Math.floor(Math.random() * alphabets.length));
//     }
//     return text;
// 



async function generatefirst() {
    try {
        // Read the contents of the "firstname.txt" file
        const data = await fs.readFile('firstname.txt', 'utf-8');
        const firstNames = JSON.parse(data);

        // Select a random name from the array
        return firstNames[Math.floor(Math.random() * firstNames.length)];
    } catch (error) {
        console.error('Error reading or parsing file:', error);
        return null;
    }
}

async function generatelast() {
    try {
        // Read the contents of the "firstname.txt" file
        const data = await fs.readFile('lastname.txt', 'utf-8');
        const firstNames = JSON.parse(data);

        // Select a random name from the array
        return firstNames[Math.floor(Math.random() * firstNames.length)];
    } catch (error) {
        console.error('Error reading or parsing file:', error);
        return null;
    }
}

// Function to generate random US number starting with 9435 and followed by 6 random digits
function generateRandomUSNumber() {
    const randomDigits = Math.floor(100000 + Math.random() * 900000); // Generate 6 random digits
    const usNumber = `9435${randomDigits}`; // Concatenate with '9435'
    return usNumber;
}

async function fetchOTP(emailId) {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto(`https://generator.email/${emailId}`);

        // Check if the email table is present, if not, wait for a short time to load
        await page.waitForSelector('#email-table', { timeout: 5000 }).catch(() => {}); // Short timeout

        // Attempt to fetch the OTP directly from the email content
        const otp = await page.evaluate(() => {
            const emailContent = document.querySelector('#email-table').textContent;
            const otpMatch = emailContent.match(/Your confirmation code is: (\d{6})/); // Matching 6 digits as OTP
            if (otpMatch && otpMatch[1]) {
                return otpMatch[1];
            }
            return null;
        });

        return otp;
    } catch (error) {
        console.error(`Error occurred while fetching OTP for ${emailId}: ${error}`);
        return null;
    } finally {
        await browser.close();
    }
}

async function getEmail() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto('https://generator.email/email-generator');
    
    // Wait for the email to load
    await page.waitForSelector('#email_ch_text');
    
    // Get the email text
    const email = await page.evaluate(() => {
        return document.getElementById('email_ch_text').innerText.trim();
    });

    await browser.close();

    return email;
}

async function saveEmail(email) {
    const filePath = 'emails.txt';

    try {
        // Check if file exists
        await fs.access(filePath); // Check if file exists asynchronously

        // File exists, so read its content
        let existingEmails = (await fs.readFile(filePath, 'utf8')).trim().split('\n');

        // Check if email already exists
        if (!existingEmails.includes(email)) {
            await fs.appendFile(filePath, email + '\n'); // Append email asynchronously
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, so create it and append email
            await fs.writeFile(filePath, email + '\n');
        } else {
            console.error('Error occurred while saving email:', error);
        }
    }
}

// Endpoint to generate random text with 7 alphabetic characters without commas
// app.get('/randomtext', (req, res) => {
//     const randomText = await generateRandomText();
//     res.send(randomText);
// });



app.get('/randomfirst', (req, res) => {
    generatefirst().then(randomName => {
        res.send(randomName);
    }).catch(error => {
        res.send('Error generating random text:', error);
    });
});

app.get('/randomlast', (req, res) => {
    generatelast().then(randomName => {
        res.send(randomName);
    }).catch(error => {
        res.send('Error generating random text:', error);
    });
});

// Endpoint to generate a random US number starting with 9435 and followed by 6 random digits
app.get('/randomus', (req, res) => {
    const randomUSNumber = generateRandomUSNumber();
    res.send(randomUSNumber);
});

app.get('/generate', async (req, res) => {
    try {
        const email = await getEmail();
        await saveEmail(email);
        res.send(email);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating email.');
    }
});

app.get('/generate/:email', async (req, res) => {
    const emailId = req.params.email;
    const otp = await fetchOTP(emailId);
    if (otp) {
        res.send(otp);
    } else {
        res.status(500).send('Error generating OTP');
    }
});

app.get('/save/:email', (req, res) => {
    const email = req.params.email;

    // Append the email to the file "valid_emails.txt"
    fs.appendFile('valid_emails.txt', email + '\n', (err) => {
        if (err) {
            console.error('Error occurred while saving email:', err);
            res.status(500).send('Error occurred while saving email.');
        } else {
            console.log('Email saved successfully.');
            res.send('Email saved successfully.');
        }
    });
});

app.get('/emailid', async (req, res) => {
    if (currentIndex < emails.length) {
        const email = emails[currentIndex++];
        console.log(email);
        res.send(email);
    } else {

        res.status(404).send('No more email IDs available');
        await sendTelegramAlert('Alert! No More Emailid');
    }
});

app.get('/otp', async (req, res) => {
    if (currentIndex > 0 && currentIndex <= emails.length) {
        const emailId = emails[currentIndex - 1];
        const otp = await fetchOTP(emailId);
        res.send(otp);
    } else {
        res.status(404).send('No email ID available');
        await sendTelegramAlert('Alert! No More Emailid');
    }
});

app.get('/indexback', (req, res) => {
    if (currentIndex > 0) {
        currentIndex--; // Decrement the index
        res.status(200).send('Index decremented successfully.');
    } else {
        res.status(404).send('Index is already at the beginning.');
    }
});

app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);

    try {
        const emailList = await fs.readFile('valid_emails.txt', 'utf8');
        emails = emailList.trim().split('\n');
        console.log(emails);
    } catch (error) {
        console.error('Error reading email list:', error);
    }
});
