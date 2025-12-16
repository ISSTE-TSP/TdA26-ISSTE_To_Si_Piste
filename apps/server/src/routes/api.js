const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    organization: "Student Cyber Games"
  });
});

module.exports = router;
