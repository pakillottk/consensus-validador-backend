const OAuthToken = require( '../Database/OAuthToken' );
const OAuthClient = require( '../Database/OAuthClient' );
const User = require( '../Database/User' );
const RoleScopes = require('./RoleScopes');

module.exports.getAccessToken = async ( bearerToken ) => {
    const token = await OAuthToken.query().eager('[user, user.[role, company]]').findOne({ access_token: bearerToken });
    const scopes = RoleScopes[ token.user.role.role ];
    if( token ) {
        return {
            accessToken: token.access_token,
            client: { id: token.client_id },
            accessTokenExpiresAt: token.access_token_expires_on,
            user: token.user,
            scopes
        };
    }
}

module.exports.getClient = async ( clientId, clientSecret ) => {
    const client = await OAuthClient.query().findOne({
        client_id: clientId,
        client_secret: clientSecret
    });

    const grants = ['password'];
    if( client ) {
        if( client.user_id ) {
            grants.push( 'client_credentials' );
        }
        return {
            clientId: client.client_id,
            clientSecret: client.client_secret,
            user_id: client.user_id,
            grants
        }
    }
}

module.exports.getUserFromClient = async ( client ) => {
    if( client.user_id ) {
        return await User.query().eager('[role, company]').findOne({id: client.user_id});
    }
}

module.exports.getRefreshToken = async ( refreshToken ) => {
    const token = await OAuthToken.query().eager('[user, user.[role, company]]').findOne({ refresh_token: refreshToken });
    if( token ) {
        return {
            refreshToken,
            refreshTokenExpiresAt: token.refresh_token_expires_on,
            client: {
                id: token.client_id
            },
            user: token.user
        };
    }

    return null;
}

module.exports.getUser = async ( username, password ) => {
    const user = await User.query().findOne({ username: username });
    if( user ) {
        const passwordValid = await user.verifyPassword( password );
        if( passwordValid ) {
            return user;
        }
    }
}

module.exports.saveToken = async ( token, client, user ) => {
    const tokenDB = await OAuthToken.query().insert({
        access_token: token.accessToken,
        access_token_expires_on: token.accessTokenExpiresAt,
        client_id: client.clientId,
        refresh_token: token.refreshToken,
        refresh_token_expires_on: token.refreshTokenExpiresAt,
        user_id: user.id,
        created_at: new Date(),
        updated_at: new Date()
    });

    if( tokenDB ) {
        return {
            accessToken: token.accessToken,
            accessTokenExpiresOn: token.accessTokenExpiresAt,
            client: { id: client.id },
            refreshToken: token.refreshToken,
            refreshTokenExpiresOn: token.refreshTokenExpiresAt,
            user: { id: user.id }
        };
    }

    return false;
}

module.exports.revokeToken = async ( token ) => {
    try {
        await OAuthToken.query().update({
            refresh_token_expires_on: new Date()
        }).where( 'refresh_token', '=', token.refreshToken );

        return true;
    } catch( error ) {
        return false;
    }
}

module.exports.logout = async ( token ) => {
    try {       
        await OAuthToken.query().delete().where( 'access_token', token.accessToken );
        return true;
    } catch( error ) {
        return false;
    }
}

module.exports.clearOutdatedTokens = async () => {
    return await OAuthToken.query().delete().where( 'access_token_expires_on', '<', new Date() );
}