const Match = require('../models/Match');
const SwapRequest = require('../models/SwapRequest');
const User = require('../models/User');
const logger = require('../utils/logger');

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // Distance in kilometers
};

// Array equality checker irrespective of order, casing, and whitespace
const areArraysEqual = (arr1, arr2) => {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
  const normalize = (str) => typeof str === 'string' ? str.toLowerCase().replace(/\s+/g, '') : str;
  const nArr1 = arr1.map(normalize);
  const nArr2 = arr2.map(normalize);
  return nArr1.every(val => nArr2.includes(val));
};

// Calculate compatibility score between two teachers
const calculateCompatibilityScore = (teacherA, teacherB, requestA, requestB) => {
  // 1. SUBJECT REQUIREMENT (MANDATORY)
  // Ensure we have subjects to compare from snapshots or teacher records
  const subjectsA = requestA.subjectCombination?.length ? requestA.subjectCombination : (teacherA?.subjects || []);
  const subjectsB = requestB.subjectCombination?.length ? requestB.subjectCombination : (teacherB?.subjects || []);

  if (!areArraysEqual(subjectsA, subjectsB) || subjectsA.length === 0) {
    return {
      totalScore: 0,
      breakdown: { mutualCounty: 0, mutualSubcounty: 0, mutualSchool: 0 },
      distance: 0,
      matchLevel: 'None'
    };
  }

  let score = 25;
  const breakdown = {
    mutualSubject: 25,
    mutualCounty: 0,
    mutualSubcounty: 0,
    mutualSchool: 0,
  };

  // Safe fallback if snapshots missing
  const aCurrentCounty = requestA.currentCounty || teacherA?.currentStation?.county;
  const aCurrentSubcounty = requestA.currentSubCounty || teacherA?.currentStation?.subCounty;
  const aCurrentSchool = requestA.currentSchool || teacherA?.currentStation?.schoolName;

  const bCurrentCounty = requestB.currentCounty || teacherB?.currentStation?.county;
  const bCurrentSubcounty = requestB.currentSubCounty || teacherB?.currentStation?.subCounty;
  const bCurrentSchool = requestB.currentSchool || teacherB?.currentStation?.schoolName;

  // arrays
  const aDesiredCounties = requestA.desiredCounties || [];
  const bDesiredCounties = requestB.desiredCounties || [];

  const aDesiredSubcounties = requestA.desiredSubCounties || [];
  const bDesiredSubcounties = requestB.desiredSubCounties || [];

  const aDesiredSchool = requestA.desiredSchool || "";
  const bDesiredSchool = requestB.desiredSchool || "";

  // Helper function to check matching logic, including 'Any' wildcard fields
  const isMatch = (desiredArrayOrStr, currentStr) => {
    if (!currentStr) return false; // Other person has no current station set? Automatic fail
    if (!desiredArrayOrStr || desiredArrayOrStr.length === 0 || desiredArrayOrStr === "Any") return true;

    if (Array.isArray(desiredArrayOrStr)) {
      if (desiredArrayOrStr.length === 0) return true;
      return desiredArrayOrStr.some(d => d.toLowerCase() === currentStr.toLowerCase());
    }
    return desiredArrayOrStr.toLowerCase() === currentStr.toLowerCase();
  };

  // County Match (25%)
  if (isMatch(aDesiredCounties, bCurrentCounty) && isMatch(bDesiredCounties, aCurrentCounty)) {
    score += 25;
    breakdown.mutualCounty = 25;
  }

  // Subcounty Match (25%)
  if (isMatch(aDesiredSubcounties, bCurrentSubcounty) && isMatch(bDesiredSubcounties, aCurrentSubcounty)) {
    score += 25;
    breakdown.mutualSubcounty = 25;
  }

  // School Match (25%)
  if (isMatch(aDesiredSchool, bCurrentSchool) && isMatch(bDesiredSchool, aCurrentSchool)) {
    score += 25;
    breakdown.mutualSchool = 25;
  }

  // 3. FINAL SCORE & COLOR CODING
  let matchLevel = 'Yellow';
  if (score === 100) {
    matchLevel = 'Green';
  } else if (score >= 75 && score <= 99) {
    matchLevel = 'Blue';
  } else if (score >= 50 && score <= 74) {
    matchLevel = 'Yellow';
  } else {
    matchLevel = 'None';
  }

  return {
    totalScore: score,
    breakdown,
    distance: 0,
    matchLevel
  };
};

// Run Gale-Shapley matching algorithm for active swap requests
const runMatchingAlgorithm = async () => {
  try {
    logger.info('Starting Gale-Shapley matching algorithm...');

    const activeRequests = await SwapRequest.find({
      status: 'active',
      isVisible: true,
    }).populate('teacher', 'firstName lastName currentStation jobGroup subjects');

    logger.info(`Found ${activeRequests.length} active swap requests`);

    // 1. Build Preference Lists matrix
    const preferences = {}; // teacherId -> [{ targetTeacherId, targetRequestId, score, breakdown, distance }]

    for (let i = 0; i < activeRequests.length; i++) {
      const reqA = activeRequests[i];
      preferences[reqA.teacher._id] = [];

      for (let j = 0; j < activeRequests.length; j++) {
        if (i === j) continue;
        const reqB = activeRequests[j];

        const compatibility = calculateCompatibilityScore(
          reqA.teacher, reqB.teacher, reqA, reqB
        );

        // User constraint: less than 50% match should be rejected automatically.
        if (compatibility.totalScore >= 50) {
          preferences[reqA.teacher._id].push({
            targetTeacherId: reqB.teacher._id,
            targetRequestId: reqB._id,
            score: compatibility.totalScore,
            breakdown: compatibility.breakdown,
            distance: compatibility.distance,
            matchLevel: compatibility.matchLevel
          });
        }
      }

      // Sort preferences highest score first
      preferences[reqA.teacher._id].sort((a, b) => b.score - a.score);
    }

    // 2. Gale-Shapley / Stable Roommates Phase 1 Loop
    const freeTeachers = Object.keys(preferences);
    const matches = {}; // teacherId -> matchedData
    const proposalsMade = {}; // teacherId -> index of next person to propose to

    freeTeachers.forEach(id => { proposalsMade[id] = 0; });

    let loopLimit = 10000; // safety breaker against indefinite loops

    while (freeTeachers.length > 0 && loopLimit > 0) {
      loopLimit--;
      const proposerId = freeTeachers.shift();
      const prefList = preferences[proposerId];
      const nextIdx = proposalsMade[proposerId];

      if (nextIdx >= prefList.length) {
        // No more valid preferences for this teacher
        continue;
      }

      // Propose to the next best
      const proposal = prefList[nextIdx];
      proposalsMade[proposerId]++; // increment for next loop if dumped

      const receiverId = proposal.targetTeacherId.toString();
      const currentMatch = matches[receiverId];

      if (!currentMatch) {
        // Receiver is free, tentatively accept!
        matches[receiverId] = { partnerId: proposerId, detail: proposal };
        matches[proposerId] = { partnerId: receiverId, detail: preferences[receiverId].find(p => p.targetTeacherId.toString() === proposerId) };
      } else {
        // Receiver already has a match, evaluate preference
        const receiverPrefList = preferences[receiverId];
        const scoreForProposer = receiverPrefList.find(p => p.targetTeacherId.toString() === proposerId)?.score || 0;
        const scoreForCurrent = receiverPrefList.find(p => p.targetTeacherId.toString() === currentMatch.partnerId)?.score || 0;

        if (scoreForProposer > scoreForCurrent) {
          // Swap! Dump currentMatch
          const dumpedId = currentMatch.partnerId;
          delete matches[dumpedId];
          freeTeachers.push(dumpedId); // dumped teacher goes back to free pool

          // Accept the new better proposer
          matches[receiverId] = { partnerId: proposerId, detail: proposal };
          matches[proposerId] = { partnerId: receiverId, detail: preferences[receiverId].find(p => p.targetTeacherId.toString() === proposerId) };
        } else {
          // Proposal rejected, proposer stays in free pool to try next preference
          freeTeachers.push(proposerId);
        }
      }
    }

    // 3. Save purely stable matches
    let matchesCreated = 0;
    const processed = new Set();

    for (const [tId, matchData] of Object.entries(matches)) {
      if (!processed.has(tId) && !processed.has(matchData.partnerId)) {
        processed.add(tId);
        processed.add(matchData.partnerId);

        const proposerReq = activeRequests.find(r => r.teacher._id.toString() === tId);

        // Check if this stable pair is already recorded
        const existingMatch = await Match.findOne({
          $or: [
            { requestId1: proposerReq._id, requestId2: matchData.detail.targetRequestId },
            { requestId1: matchData.detail.targetRequestId, requestId2: proposerReq._id },
          ],
        });

        if (!existingMatch) {
          await Match.create({
            requestId1: proposerReq._id,
            requestId2: matchData.detail.targetRequestId,
            teacher1: tId,
            teacher2: matchData.partnerId,
            compatibilityScore: matchData.detail.score,
            scoreBreakdown: matchData.detail.breakdown,
            distanceBetweenStations: matchData.detail.distance,
            matchLevel: matchData.detail.matchLevel,
            status: 'pending',
          });
          matchesCreated++;
        } else {
          // Update existing match fields if they changed
          let updated = false;
          if (existingMatch.compatibilityScore !== matchData.detail.score || existingMatch.matchLevel !== matchData.detail.matchLevel || !existingMatch.scoreBreakdown || existingMatch.scoreBreakdown.mutualSubject === undefined) {
            existingMatch.compatibilityScore = matchData.detail.score;
            existingMatch.matchLevel = matchData.detail.matchLevel;
            existingMatch.scoreBreakdown = matchData.detail.breakdown;
            updated = true;
          }
          if (updated) await existingMatch.save();
        }
      }
    }

    logger.info(`Gale-Shapley matching complete. Generated ${matchesCreated} new stable pairs.`);

    return {
      success: true,
      matchesCreated,
      totalRequests: activeRequests.length,
    };
  } catch (error) {
    logger.error('Matching algorithm error:', error);
    throw error;
  }
};

// Get matches for a specific teacher
const getMatchesForTeacher = async (teacherId, minScore = 0) => {
  try {
    const matches = await Match.find({
      $or: [{ teacher1: teacherId }, { teacher2: teacherId }],
      compatibilityScore: { $gte: minScore },
      status: { $in: ['pending', 'viewed_by_teacher1', 'viewed_by_teacher2', 'viewed_by_both'] },
    })
      .populate('teacher1', 'firstName lastName email profilePhoto currentStation jobGroup subjects')
      .populate('teacher2', 'firstName lastName email profilePhoto currentStation jobGroup subjects')
      .populate('requestId1')
      .populate('requestId2')
      .sort({ compatibilityScore: -1, createdAt: -1 });

    return matches;
  } catch (error) {
    logger.error('Get matches for teacher error:', error);
    throw error;
  }
};

module.exports = {
  runMatchingAlgorithm,
  calculateCompatibilityScore,
  getMatchesForTeacher,
  calculateDistance,
};
