import { isSpoofedBot } from "@arcjet/inspect";
import aj from "../lib/arcject.js";

export const arcjectProtection = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, { requested: 1 }); // Deduct 5 tokens from the bucket
    console.log("Arcjet decision", decision);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res
          .status(429)
          .json({ message: "Too Many Requests. Try again later" });
      } else if (decision.reason.isBot()) {
        return res.status(403).json({ message: "No bots allowed" });
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
    } else if (decision.results.some(isSpoofedBot)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  } catch (error) {
    console.log("Error in arcjectProtection middleware:", error);
    next();
  }
};
