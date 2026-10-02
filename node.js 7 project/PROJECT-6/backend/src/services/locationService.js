import pool from "../config/db.js";

export const createLocation = async ({
    code,
    name,
    latitude = null,
    longitude = null
}) => {
    const [result] = await pool.execute(
        `
        INSERT INTO locations
            (code, name, latitude, longitude)
        VALUES
            (?, ?, ?, ?)
        `,
        [
            code.trim(),
            name.trim(),
            latitude,
            longitude
        ]
    );

    // Graph mutation → increase graph version
    await pool.execute(
        `
        UPDATE graph_versions
        SET version = version + 1
        WHERE id = 1
        `
    );

    const [rows] = await pool.execute(
        `
        SELECT *
        FROM locations
        WHERE id = ?
        `,
        [result.insertId]
    );

    return rows[0];
};

export const getAllLocations = async () => {
    const [rows] = await pool.execute(
        `
        SELECT *
        FROM locations
        ORDER BY id ASC
        `
    );

    return rows;
};

export const getLocationById = async (id) => {
    const [rows] = await pool.execute(
        `
        SELECT *
        FROM locations
        WHERE id = ?
        `,
        [id]
    );

    return rows[0] || null;
};

export const updateLocation = async (
    id,
    {
        code,
        name,
        latitude = null,
        longitude = null
    }
) => {
    const existing = await getLocationById(id);

    if (!existing) {
        return null;
    }

    await pool.execute(
        `
        UPDATE locations
        SET
            code = ?,
            name = ?,
            latitude = ?,
            longitude = ?
        WHERE id = ?
        `,
        [
            code.trim(),
            name.trim(),
            latitude,
            longitude,
            id
        ]
    );

    // Graph mutation
    await pool.execute(
        `
        UPDATE graph_versions
        SET version = version + 1
        WHERE id = 1
        `
    );

    return getLocationById(id);
};

export const deleteLocation = async (id) => {
    const existing = await getLocationById(id);

    if (!existing) {
        return null;
    }

    await pool.execute(
        `
        DELETE FROM locations
        WHERE id = ?
        `,
        [id]
    );

    // Graph mutation
    await pool.execute(
        `
        UPDATE graph_versions
        SET version = version + 1
        WHERE id = 1
        `
    );

    return existing;
};