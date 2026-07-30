import app from "./app";
import { env } from "./config/env.js";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(
    `🚀 LearnFlow AI Backend running on http://localhost:${PORT} in ${env.NODE_ENV} mode`
  );
});