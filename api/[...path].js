const { proxyRequest } = require("../proxy/backendProxy");

module.exports = async (req, res) => {
  await proxyRequest(req, res);
};
