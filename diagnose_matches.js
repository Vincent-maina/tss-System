const mongoose = require('mongoose');
require('dotenv').config({ path: './Backend/.env' });

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = require('./Backend/src/models/User');
        const Match = require('./Backend/src/models/Match');

        const user = await User.findOne({ firstName: 'Vincent' });
        console.log('Vincent User ID:', user._id);

        const matches = await Match.find({
            $or: [{ teacher1: user._id }, { teacher2: user._id }]
        });

        console.log('Total matches in DB for Vincent:', matches.length);

        const activeMatches = matches.filter(m =>
            m.compatibilityScore >= 60 &&
            ['pending', 'viewed_by_teacher1', 'viewed_by_teacher2', 'viewed_by_both'].includes(m.status)
        );

        console.log('Matches passing the API constraints:', activeMatches.length);

        if (matches.length > 0) {
            console.log('Details of a match:');
            console.log('- Status:', matches[0].status);
            console.log('- Score:', matches[0].compatibilityScore);
            console.log('- Admin Approved:', matches[0].adminApproved);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
