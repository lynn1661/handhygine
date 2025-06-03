module.exports = () => {
    return {
        port: 3001,
        sio: {
            enabled: true,
        },
        db: {
            mongo: "mongodb+srv://lynn000718:CS2BNuvOfRRtpIIz@cluster0.1vlaq.mongodb.net/Polyuhandhygiene?retryWrites=true&w=majority&appName=Cluster0",
        },
        log: true
    };
};