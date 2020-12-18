class GeneralError extends Error {
    constructor(message) {
        super();
        this.message = message;
    }

    getCode() {
        if (this instanceof AuthError) {
            return 401;
        }

        return 500;
    }
}

class AuthError extends GeneralError {}

module.exports = { GeneralError, AuthError };