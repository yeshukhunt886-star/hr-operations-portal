module.exports = {

    apps: [

        {
            name:
                "chat-app",

            script:
                "./server.js",

            instances:
                2,

            exec_mode:
                "cluster",

            watch:
                false,

            autorestart:
                true,

            max_memory_restart:
                "500M",

            env: {

                NODE_ENV:
                    "production",

                PORT:
                    3001

            }

        }

    ]

};