const errorHandler = (err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || "Something went wrong";

  res.status(errorStatus).json({
    message: errorMessage,
    success: false,
    status: errorStatus,
    stack: err.stack,
  });
};

module.exports = errorHandler;
