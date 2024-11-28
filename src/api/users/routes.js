const { registerHandler, loginHandler, getUserByIdHandler,  } = require('./handler');
const { addUserDataHandler } = require('../nutrition/handler')
const authMiddleware  = require('../../middleware/authMiddleware');
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
    },
    {
        method: 'GET',
        path: '/users/{id}',
        handler: getUserByIdHandler
    },
    {
        method: 'POST',
        path: '/users/data',
        handler: addUserDataHandler,
        options: {
            pre: [
                { method: authMiddleware }, // Middleware autentikasi
            ],
        },
    },
];

module.exports = routes;