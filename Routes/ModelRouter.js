const DBQuery = require( '../Database/Queries/DBQuery' );
const ModelController = require( '../Controllers/ModelController' ).builder
const CheckScope = require('../Auth/CheckScope');

module.exports = ( model, including, queryBuilder, CustomController, passUser, passRes, passCompany, middlewares ) => {
    const Router = require( 'express' ).Router();
    const controller = CustomController ? CustomController(model) : ModelController( model );
    queryBuilder = queryBuilder || ( () => new DBQuery( model ) );
    including = including || '';
    middlewares = middlewares || {};

    Router.get( '/', CheckScope( model.name, 'get' ), async ( req, res ) => {
        const data = await controller.index( including, await queryBuilder( req ) );
        res.status(200).send( data );
    });

    Router.get( '/:id', CheckScope( model.name, 'get' ), async ( req, res ) => {
        const data = await controller.get( req.params.id, including, await queryBuilder( req ) );
        res.status(200).send( data );
    });

    Router.post( '/', CheckScope( model.name, 'post' ), middlewares.post || ( ( req, res, next ) => next() ), async ( req, res ) => {
        try {
            const user = req.res.locals.oauth.token.user;
            if( passUser ) {
                if( !req.body.user_id ) {
                    req.body.user_id = user.id;
                } else {
                    req.body.req_user_id = user.id;
                }
            }
            if( passRes ) {
                const data = await controller.create( (passCompany && !req.body.company_id) ? {...req.body, company_id: user.company_id } : req.body, including, req.query, res, req.files );
            } else {
                const data = await controller.create( (passCompany && !req.body.company_id) ? {...req.body, company_id: user.company_id } : req.body, including, req.query, req.files );
                res.status(200).send( data );
            }
        } catch( error ) {
            res.status( 400 ).send( error.message );
        }
    });

    Router.put( '/:id', CheckScope( model.name, 'put' ), middlewares.put || ( ( req, res, next ) => next() ), async ( req, res ) => {
        try {
            const user = req.res.locals.oauth.token.user;
            if( passUser ) {
                if( !req.body.user_id ) {
                    req.body.user_id = user.id;
                } else {
                    req.body.req_user_id = user.id;
                }
            }
            const data = await controller.update( req.params.id, req.body, including, req.files );
            res.status(200).send( data );
        } catch( error ) {
            res.status( 400 ).send( error.message );
        }
    });

    Router.delete( '/:id', CheckScope( model.name, 'remove' ), async( req, res ) => {
        try {
            const deleted = await controller.delete( req.params.id );
            res.status(200).send( deleted );
        } catch( error ) {
            res.status( 400 ).send( error.message );
        }
    });

    //Mass delete
    Router.post('/bulkDelete', CheckScope( model.name, 'remove' ), async( req, res ) => {
        try {
            const deleted = await controller.bulkDelete( req.body );
            res.status(200).send( deleted );
        } catch( error ) {
            res.status( 400 ).send( error.message );
        }
    })
    
    Router.controller = controller
    return Router;
}