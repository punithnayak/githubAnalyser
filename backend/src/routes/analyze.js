const router = require('express').Router();
const { analyzeRepository } = require('../controllers/analyzeController');

router.post('/', async (req,res)=>{
  try{
    const { repo_url } = req.body;
    if(!repo_url){
      return res.status(400).json({ success:false, error:'Repository URL is required' });
    }
    const data = await analyzeRepository(repo_url);
    res.json({ success:true, data });
  }catch(err){
    console.error('Analyze error:', err.message);
    res.status(500).json({ success:false, error:'Analysis failed' });
  }
});

module.exports = router;