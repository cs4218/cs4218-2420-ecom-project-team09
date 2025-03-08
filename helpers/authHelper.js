import bcrypt from "bcrypt";

export const hashPassword = async (password) => {
    try {
        // Check if password is null or undefined
        if (password === null || password === undefined) {
            throw new Error("Password cannot be null or undefined");
        }

        // Add validation for empty string
        if (password === '') {
            throw new Error("Password cannot be empty");
        }

        // Ensure password is a string
        const passwordStr = String(password);

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(passwordStr, saltRounds);
        return hashedPassword;

    } catch (error) {
        console.error("Error hashing password:", error.message);
        throw error;
    }
};

export const comparePassword = async (password, hashedPassword) => {
    try {
        // Check for null or undefined inputs
        if (password === null || password === undefined) {
          throw new Error("Password cannot be null or undefined");
        }
        
        if (hashedPassword === null || hashedPassword === undefined) {
          throw new Error("Hashed password cannot be null or undefined");
        }

        // Add validation for empty string
        if (password === '') {
            throw new Error("Password cannot be empty");
        }
        
        // Ensure password is a string
        const passwordStr = String(password);
        
        return await bcrypt.compare(passwordStr, hashedPassword);
        
    } catch (error) {
        console.error("Error comparing passwords:", error.message);
        throw error;
    }
}
