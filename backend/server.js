import { connectDB } from "./src/lib/db.js";
import { ENV } from "./src/lib/env.js";
import { server } from "./src/lib/socket.js";
import "./src/app.js";

const PORT = ENV.PORT || 3000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.log(error));
