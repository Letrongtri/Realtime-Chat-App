import multer from "multer";

const storage = multer.diskStorage({
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const imageFilter = (_, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

export const uploadAvatar = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

export const uploadFile = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
