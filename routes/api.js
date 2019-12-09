/*
*
*
*       Complete the API routing below
*       
*       
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
const MONGODB_CONNECTION_STRING = process.env.DB;
//Example connection: MongoClient.connect(MONGODB_CONNECTION_STRING, function(err, db) {});
function convertObjId(str, res){
  try { let id = ObjectId(str);
       return id;
  }
  catch(e){ 
    console.log('input an invalid id');
    res.send('invalid id');
  }
}
module.exports = function (app) {
MongoClient.connect(MONGODB_CONNECTION_STRING, (err, client) => {
  if(err){
    console.log(err);
  }
  else{
    let booksCollection = client.db('testdb').collection('book');
    let commentsCollection = client.db('testdb').collection('comment');
    
     app.route('/api/books')
    .get(function (req, res){
      //response will be array of book objects
      //json res format: [{"_id": bookid, "title": book_title, "commentcount": num_of_comments },...]
       booksCollection.aggregate([{
         $lookup:
           {
             from: "comment",
             localField: "_id",
             foreignField: "bookid",
             as: "comments"
           }},{
         $project:{
              _id: 1, title: 1, timestamp: 1, commentcount: {$size: "$comments"}
         }
      }],(err, results) => {
              res.json(results);
           })
        })
    
    .post(function (req, res){
      var title = req.body.title;
      //response will contain new book object including atleast _id and title
       if(title){
        booksCollection.insertOne({title: title, timestamp: new Date().toUTCString()},(err, doc) => {
          console.log(doc);
          res.json(doc.ops[0])})
       }
    })
    
    .delete(function(req, res){
      //if successful response will be 'complete delete successful'
    booksCollection.remove({},(err,doc) => {
      if(!err){
         commentsCollection.remove({},(err, doc) => {
           if(!err){
               res.send('complete delete successful');
             }
           else {
              res.send('error accured');
            }
         })
      }
      else {
        res.send('error accured');
      }
    });
    });



  app.route('/api/books/:id')
    .get(function (req, res){
      var bookid = convertObjId(req.params.id, res);
      //json res format: {"_id": bookid, "title": book_title, "comments": [comment,comment,...]}
      if(bookid){
                  booksCollection.findOne({_id: bookid}, (err, book) => {
                      if(!book){
                          res.send('book is not found');
                        }
                      else {
                            commentsCollection.find({bookid:bookid}).toArray((err, comments) => {
                              res.json({_id: bookid, title: book.title, comments: comments.map(comment => (comment.comment))})
                            })
                        }
                  })
              }
          })
    
    .post(function(req, res){
      var bookid = convertObjId(req.params.id, res);
      var comment = req.body.comment;
      //json res format same as .get
    if(bookid && comment){
          booksCollection.findOne({_id: bookid}, (err, book) => {
            if(!book){
              res.send('book is not found');
            }
            else {
                commentsCollection.insertOne({bookid, comment}, (err,commentCrs) => {
                  commentsCollection.find({bookid:bookid}).toArray((err, comments) => {
                    res.json({_id: bookid, title: book.title, comments: comments.map(comment => (comment.comment))})
                  })
                });
            }
          })
          
    }
    else if(!comment) {
      res.send('comment is empty!')
    }
    })
    
    .delete(function(req, res){
      var bookid = convertObjId(req.params.id);
      //if successful response will be 'delete successful'
    if(bookid){
            booksCollection.remove({_id:bookid},(err,doc) => {
              if(!err){
                 commentsCollection.remove({bookid: bookid},(err, doc) => {
                   if(!err){
                       res.send('delete successful');
                     }
                   else {
                      res.send('error accured');
                    }
                 })
              }
              else {
                res.send('error accured');
              }
          });
          }
      });
    }
  })
};
