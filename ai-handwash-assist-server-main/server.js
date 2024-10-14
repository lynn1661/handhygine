const server=require('micro-server');
server.start({projectDir:__dirname});

const cors = require('cors');
app.use(cors({
    origin: 'https://localhost',
    methods: 'GET,POST',
    credentials: true
}));