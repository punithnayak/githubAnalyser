const router = require('express').Router();
router.get('/',(_,res)=>res.json({ status:'healthy' }));
module.exports = router;
