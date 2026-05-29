export const fakeAuth = (req, res, next) => {
  req.user = {
    id: "6837f0b8c1234567890abcd1",
    role: "user",
    displayName: "Luna Atelier",
    username: "lunaatelier",
  };

  next();
};
