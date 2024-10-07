module.exports = () => {
    return {
        port: 3000,
        sio: {
            enabled: true,
        },
        db: {
            mongo: "mongodb+srv://lynn000718:CS2BNuvOfRRtpIIz@cluster0.1vlaq.mongodb.net/Handwash?retryWrites=true&w=majority&appName=Cluster0",
        },
        log: true
    };
};