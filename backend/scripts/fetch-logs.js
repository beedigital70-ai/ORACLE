const axios = require('axios');

(async () => {
  try {
    const runsRes = await axios.get('https://api.github.com/repos/beedigital70-ai/ORACLE/actions/runs?per_page=1');
    const latestRunId = runsRes.data.workflow_runs[0].id;
    console.log("Latest Run ID:", latestRunId);
    
    const jobsRes = await axios.get(`https://api.github.com/repos/beedigital70-ai/ORACLE/actions/runs/${latestRunId}/jobs`);
    const jobId = jobsRes.data.jobs[0].id;
    console.log("Job ID:", jobId);
    
    try {
      const logRes = await axios.get(`https://api.github.com/repos/beedigital70-ai/ORACLE/actions/jobs/${jobId}/logs`);
      console.log(logRes.data);
    } catch (e) {
      console.log("Cannot fetch raw logs without auth, falling back to finding the exact error line by scanning the repo files.");
    }
  } catch (err) {
    console.error(err.message);
  }
})();
