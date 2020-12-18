const mkQuery = (sql, pool) => {
    return async (params) => {

        const conn = await pool.getConnection();

        try {
            const response = await conn.query(sql, params);
            return response[0][0];
        } catch (e) {
            console.error(e);
            throw e;
        } finally {
            conn.release();
        }

    }
}

module.exports = {
    mkQuery
}