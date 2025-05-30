module.exports = () => {
    return {
        port: 3000,
        sio: {
            enabled: true,
        },
        db: {
            type: "sqlite",
            sqlite: "./database/handwash.db"
        },
        log: true
    };
};