import app from "./src/app.js";
import { connectDB } from "./src/lib/db.js";
import { ENV } from "./src/lib/env.js";

const PORT = ENV.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.log(error));
