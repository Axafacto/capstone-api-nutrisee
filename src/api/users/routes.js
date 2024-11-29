// src/api/users/routes.js
const { registerHandler, loginHandler, getUserByIdHandler } = require('./handler');
const { validateToken } = require('../../middleware/authMiddleware');
const { updateUserDataHandler } = require('../nutrition/handler');


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
        path: '/auth/register',
        handler: registerHandler,
    },
    {
        method: 'POST',
        path: '/auth/login',
        handler: loginHandler,
    },
    {
        method: 'GET',
        path: '/users/{id}',
        handler: getUserByIdHandler,
    },
    {
        method: 'POST',
        path: '/users/data',
        handler: updateUserDataHandler,
        options: {
            pre: [
                { method: validateToken, },  // Menggunakan validateToken sebagai middleware
            ],
        },
    }
      
];

module.exports = routes;
