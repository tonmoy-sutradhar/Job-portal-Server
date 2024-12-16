/**
 * 1. after successful login: generate a jwt token
 * npm i jsonwebtoken, cookie-parser
 * jwt.sign(payload, secret, {expiresIN: '1h'})
 *
 *
 * 2. send token (generated in the server side) to the client side
 * local storage ----> easier
 *
 *
 * httpOnly cookies ---->>> better
 *
 * 3. for sensitive or secure or private apis: send token to the server side
 *
 *
 * 4. validate the token in the server side:
 * if valid: provide data
 * if not valid: logout
 *
 */