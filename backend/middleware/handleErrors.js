const { GeneralError } = require('../utils/errors');

const handleErrors = (err, req, res, next) => {
    if (err instanceof GeneralError) {
        return res.status(err.getCode()).type('application/json').json({
            success: false,
            error: err.message
        });
    }

    return res.status(500).type('application/json').json({
        success: false,
        error: err.message
    });
}

module.exports = handleErrors;