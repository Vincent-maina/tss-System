require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const makeAdmin = async (email) => {
    if (!email) {
        console.log('Please provide a user email: node make-admin.js <email>');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Clean and normalize the email search query to match MongoDB conventions
        const cleanEmail = email.toLowerCase().trim();

        // Find matching user and update their role flag
        const user = await User.findOneAndUpdate({ email: cleanEmail }, { role: 'admin' }, { new: true });

        if (!user) {
            console.log(`\nERROR: User not found! \nWe could not find any registered account using the email: "${cleanEmail}"\nPlease ensure that you have registered this account on the frontend first before making it an admin.\n`);
        } else {
            console.log(`\nSUCCESS! User ${cleanEmail} is now an admin!`);
        }
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        mongoose.disconnect();
    }
};

makeAdmin(process.argv[2]);
