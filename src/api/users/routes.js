const { registerHandler, loginHandler } = require('./handler');
const routes = [
    {
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return {
                status: 'success',
                message: 'Berhasil!',
            };
        }
    },
    {
        method: 'POST',
        path: '/register',
        handler: registerHandler,
    },
    {
        method: 'POST',
        path: '/login',
        handler: loginHandler,
    }
];

module.exports = routes;