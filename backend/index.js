import "dotenv/config";
import app from "./server.js";

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});