const notFound = (req, res) => {

    res.status(404).json({
        success: false,
        message: "Route Not Found"
    });

};

export default notFound;