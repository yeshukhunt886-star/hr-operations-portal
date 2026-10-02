import pool from "../config/db.js";

const incrementGraphVersion = async (connection) => {
    await connection.execute(
        `
        UPDATE graph_versions
        SET version = version + 1
        WHERE id = 1
        `
    );
};

export const createConnection = async ({
    sourceLocationId,
    destinationLocationId,
    weight,
    isDirected = true
}) => {
    const dbConnection = await pool.getConnection();

    try {
        await dbConnection.beginTransaction();

        // Check source location
        const [sourceRows] = await dbConnection.execute(
            `
            SELECT id
            FROM locations
            WHERE id = ?
            `,
            [sourceLocationId]
        );

        if (sourceRows.length === 0) {
            const error = new Error(
                "Source location not found"
            );

            error.statusCode = 404;

            throw error;
        }

        // Check destination location
        const [destinationRows] =
            await dbConnection.execute(
                `
                SELECT id
                FROM locations
                WHERE id = ?
                `,
                [destinationLocationId]
            );

        if (destinationRows.length === 0) {
            const error = new Error(
                "Destination location not found"
            );

            error.statusCode = 404;

            throw error;
        }

        // Check duplicate connection
        const [duplicateRows] =
            await dbConnection.execute(
                `
                SELECT id
                FROM connections
                WHERE source_location_id = ?
                  AND destination_location_id = ?
                  AND is_directed = ?
                `,
                [
                    sourceLocationId,
                    destinationLocationId,
                    isDirected
                ]
            );

        if (duplicateRows.length > 0) {
            const error = new Error(
                "Connection already exists"
            );

            error.statusCode = 409;

            throw error;
        }

        const [result] =
            await dbConnection.execute(
                `
                INSERT INTO connections
                (
                    source_location_id,
                    destination_location_id,
                    weight,
                    is_directed
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    sourceLocationId,
                    destinationLocationId,
                    weight,
                    isDirected
                ]
            );

        // If the connection is bidirectional,
        // store the reverse edge too.
        if (!isDirected) {
            const [reverseRows] =
                await dbConnection.execute(
                    `
                    SELECT id
                    FROM connections
                    WHERE source_location_id = ?
                      AND destination_location_id = ?
                      AND is_directed = FALSE
                    `,
                    [
                        destinationLocationId,
                        sourceLocationId
                    ]
                );

            if (reverseRows.length === 0) {
                await dbConnection.execute(
                    `
                    INSERT INTO connections
                    (
                        source_location_id,
                        destination_location_id,
                        weight,
                        is_directed
                    )
                    VALUES (?, ?, ?, FALSE)
                    `,
                    [
                        destinationLocationId,
                        sourceLocationId,
                        weight
                    ]
                );
            }
        }

        // Graph changed.
        await incrementGraphVersion(dbConnection);

        await dbConnection.commit();

        const [rows] = await pool.execute(
            `
            SELECT
                c.id,
                c.source_location_id AS sourceLocationId,
                sl.code AS sourceCode,
                sl.name AS sourceName,

                c.destination_location_id AS destinationLocationId,
                dl.code AS destinationCode,
                dl.name AS destinationName,

                c.weight,
                c.is_directed AS isDirected,
                c.created_at AS createdAt

            FROM connections c

            INNER JOIN locations sl
                ON sl.id = c.source_location_id

            INNER JOIN locations dl
                ON dl.id = c.destination_location_id

            WHERE c.id = ?
            `,
            [result.insertId]
        );

        return rows[0];
    } catch (error) {
        await dbConnection.rollback();

        throw error;
    } finally {
        dbConnection.release();
    }
};

export const getAllConnections = async () => {
    const [rows] = await pool.execute(
        `
        SELECT
            c.id,

            c.source_location_id AS sourceLocationId,
            sl.code AS sourceCode,
            sl.name AS sourceName,

            c.destination_location_id AS destinationLocationId,
            dl.code AS destinationCode,
            dl.name AS destinationName,

            c.weight,
            c.is_directed AS isDirected,
            c.created_at AS createdAt,
            c.updated_at AS updatedAt

        FROM connections c

        INNER JOIN locations sl
            ON sl.id = c.source_location_id

        INNER JOIN locations dl
            ON dl.id = c.destination_location_id

        ORDER BY c.id ASC
        `
    );

    return rows;
};

export const getConnectionById = async (id) => {
    const [rows] = await pool.execute(
        `
        SELECT
            c.id,

            c.source_location_id AS sourceLocationId,
            sl.code AS sourceCode,
            sl.name AS sourceName,

            c.destination_location_id AS destinationLocationId,
            dl.code AS destinationCode,
            dl.name AS destinationName,

            c.weight,
            c.is_directed AS isDirected,
            c.created_at AS createdAt,
            c.updated_at AS updatedAt

        FROM connections c

        INNER JOIN locations sl
            ON sl.id = c.source_location_id

        INNER JOIN locations dl
            ON dl.id = c.destination_location_id

        WHERE c.id = ?
        `,
        [id]
    );

    return rows[0] || null;
};

export const updateConnection = async (
    id,
    {
        weight,
        isDirected
    }
) => {
    const dbConnection = await pool.getConnection();

    try {
        await dbConnection.beginTransaction();

        const [existingRows] =
            await dbConnection.execute(
                `
                SELECT *
                FROM connections
                WHERE id = ?
                `,
                [id]
            );

        if (existingRows.length === 0) {
            const error = new Error(
                "Connection not found"
            );

            error.statusCode = 404;

            throw error;
        }

        const existing = existingRows[0];

        /*
         * For a bidirectional connection we maintain
         * two physical rows.
         */

        if (
            isDirected === false &&
            existing.is_directed === true
        ) {
            // Convert the current connection into
            // bidirectional representation.

            await dbConnection.execute(
                `
                UPDATE connections
                SET
                    weight = ?,
                    is_directed = FALSE
                WHERE id = ?
                `,
                [weight, id]
            );

            const [reverseRows] =
                await dbConnection.execute(
                    `
                    SELECT id
                    FROM connections
                    WHERE source_location_id = ?
                      AND destination_location_id = ?
                      AND is_directed = FALSE
                    `,
                    [
                        existing.destination_location_id,
                        existing.source_location_id
                    ]
                );

            if (reverseRows.length === 0) {
                await dbConnection.execute(
                    `
                    INSERT INTO connections
                    (
                        source_location_id,
                        destination_location_id,
                        weight,
                        is_directed
                    )
                    VALUES (?, ?, ?, FALSE)
                    `,
                    [
                        existing.destination_location_id,
                        existing.source_location_id,
                        weight
                    ]
                );
            }
        } else if (
            isDirected === true &&
            existing.is_directed === false
        ) {
            /*
             * Convert bidirectional connection to directed.
             */

            await dbConnection.execute(
                `
                UPDATE connections
                SET
                    weight = ?,
                    is_directed = TRUE
                WHERE id = ?
                `,
                [weight, id]
            );

            await dbConnection.execute(
                `
                DELETE FROM connections
                WHERE source_location_id = ?
                  AND destination_location_id = ?
                  AND is_directed = FALSE
                  AND id <> ?
                `,
                [
                    existing.destination_location_id,
                    existing.source_location_id,
                    id
                ]
            );
        } else {
            await dbConnection.execute(
                `
                UPDATE connections
                SET
                    weight = ?,
                    is_directed = ?
                WHERE id = ?
                `,
                [
                    weight,
                    isDirected,
                    id
                ]
            );

            // If bidirectional, update reverse edge.
            if (isDirected === false) {
                await dbConnection.execute(
                    `
                    UPDATE connections
                    SET weight = ?
                    WHERE source_location_id = ?
                      AND destination_location_id = ?
                      AND is_directed = FALSE
                    `,
                    [
                        weight,
                        existing.destination_location_id,
                        existing.source_location_id
                    ]
                );
            }
        }

        // Graph changed.
        await incrementGraphVersion(dbConnection);

        await dbConnection.commit();

        return getConnectionById(id);
    } catch (error) {
        await dbConnection.rollback();

        throw error;
    } finally {
        dbConnection.release();
    }
};

export const deleteConnection = async (id) => {
    const dbConnection = await pool.getConnection();

    try {
        await dbConnection.beginTransaction();

        const [rows] = await dbConnection.execute(
            `
            SELECT *
            FROM connections
            WHERE id = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            const error = new Error(
                "Connection not found"
            );

            error.statusCode = 404;

            throw error;
        }

        const connection = rows[0];

        await dbConnection.execute(
            `
            DELETE FROM connections
            WHERE id = ?
            `,
            [id]
        );

        // Delete reverse edge for bidirectional connection.
        if (connection.is_directed === 0) {
            await dbConnection.execute(
                `
                DELETE FROM connections
                WHERE source_location_id = ?
                  AND destination_location_id = ?
                  AND is_directed = FALSE
                `,
                [
                    connection.destination_location_id,
                    connection.source_location_id
                ]
            );
        }

        // Graph changed.
        await incrementGraphVersion(dbConnection);

        await dbConnection.commit();

        return connection;
    } catch (error) {
        await dbConnection.rollback();

        throw error;
    } finally {
        dbConnection.release();
    }
};

export const getGraphVersion = async () => {
    const [rows] = await pool.execute(
        `
        SELECT version
        FROM graph_versions
        WHERE id = 1
        `
    );

    return rows[0]?.version ?? 1;
};