const jwt = require("jsonwebtoken");
const credentials = require("./credentials.js")

const verifyToken = (req, res, next) => {
    console.log("Verify token entered");
    const token = req.cookies["AuthToken"];
    console.log(`token is ${token}`);
    if (!token) {
        return res.status(403).send("A (recent) token is required for authentication");
    }

    try {
        const decoded = jwt.verify(token, credentials.page_login_key);
        req.user = decoded;
    } catch (err) {
        return res.status(401).send("Invalid token");
    }

    return next();
};

module.exports = verifyToken;
