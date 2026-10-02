-- users table
CREATE TABLE users (

    id INT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(100) NOT NULL UNIQUE,

    email VARCHAR(150) UNIQUE,

    password VARCHAR(255) NOT NULL,

    profile_picture VARCHAR(255) DEFAULT NULL,

    socket_id VARCHAR(255) DEFAULT NULL,

    status ENUM('online','offline') DEFAULT 'offline',

    last_seen DATETIME DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);
-- message table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT DEFAULT NULL,
    room_id INT DEFAULT NULL,
    chat_type ENUM('private','group') NOT NULL,
    message TEXT,
    message_type ENUM(
        'text',
        'image',
        'video',
        'audio',
        'document'
    ) DEFAULT 'text',

    file_url VARCHAR(255),
    reply_to INT DEFAULT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    FOREIGN KEY (receiver_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);



-- message_status
CREATE TABLE message_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM(
        'sent',
        'delivered',
        'read'
    ) DEFAULT 'sent',

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (message_id)
    REFERENCES messages(id)
    ON DELETE CASCADE,

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- group
CREATE TABLE groups (

    id INT AUTO_INCREMENT PRIMARY KEY,

    group_name VARCHAR(150) NOT NULL,

    group_image VARCHAR(255),

    created_by INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE CASCADE

);

-- gropu members
CREATE TABLE group_members (

    id INT AUTO_INCREMENT PRIMARY KEY,

    group_id INT NOT NULL,

    user_id INT NOT NULL,

    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (group_id)
    REFERENCES groups(id)
    ON DELETE CASCADE,

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE

);

-- grop messages
CREATE TABLE group_messages (

    id INT AUTO_INCREMENT PRIMARY KEY,

    group_id INT NOT NULL,

    sender_id INT NOT NULL,

    message TEXT,

    message_type ENUM(
        'text',
        'image',
        'video',
        'audio',
        'document'
    ) DEFAULT 'text',

    file_url VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (group_id)
    REFERENCES groups(id)
    ON DELETE CASCADE,

    FOREIGN KEY (sender_id)
    REFERENCES users(id)
    ON DELETE CASCADE

);

--notifications 
CREATE TABLE notifications (

    id INT AUTO_INCREMENT PRIMARY KEY,

    sender_id INT,

    receiver_id INT,

    title VARCHAR(255),

    message TEXT,

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    FOREIGN KEY (receiver_id)
    REFERENCES users(id)
    ON DELETE CASCADE

);

-- index
