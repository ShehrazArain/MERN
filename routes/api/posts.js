const express = require("express");
const router = express.Router();
const { check, validationResult } = require('express-validator')
const auth = require('../../middleware/auth')

const Post = require('../../models/Post')
const User = require('../../models/User')
const Profile = require('../../models/Profile')


// @route    POST api/posts
// @desc     Create a post
// @access   Public

router.post('/', [auth,[
    check('text', 'text must be required').not().isEmpty()
]], async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    try {
        const user = await User.findById(req.user.id).select('-password')
        const newPost = new Post({
            text: req.body.text,
            name: user.name, 
            avatar: user.avatar,
            user: req.user.id
        })

        const post = await newPost.save();
        res.json(post)

    } catch (err) {
        console.error(err.message)
        return res.status(500).send('Server Error')
    }
});


// @route    GET api/posts
// @desc     Get all posts
// @access   Private  

router.get('/',auth, async (req, res) => {
    try {

        const posts = await Post.find().sort({ date: -1 })  
        res.json(posts)
    } catch (err) {
        console.error(err.message)
        return res.status(500).send('Server Error')
    }
})


// @route    GET api/posts/:id
// @desc     Get post by ID
// @access   Private   

router.get('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if(!post) {      
            return res.status(404).json({ msg: 'Post not Found' })
        }

        res.json(post)
    } catch (err) {
        console.error(err.message)

        // when Id is not a valid objectID
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Not a valid ID' })
        }

        return res.status(500).send('Server Error')
    }
})


// @route    DELETE api/posts/:id
// @desc     Delete a posts
// @access   Private    

router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' })
        }
        // Check user
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        await post.remove();
        res.json({ msg: 'Post removed' })
    } catch (err) {
        console.error(err.message)
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Not a valid ID' })
        }
        return res.status(500).send('Server Error')
    }
})


// @route    PUT api/posts/like/:id
// @desc     like a posts
// @access   Private    
router.put('/like/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        // check if post has been already been liked
        if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
            return res.status(400).json({ msg: 'Post already liked' })
        }
        
        post.likes.unshift({ user: req.user.id })
        
        await post.save()
        
        res.json(post.likes)
        
    } catch (err) {
        console.error('err.message');
        return res.status(500).send('Server Error')
    }
})


// @route    PUT api/posts/unlike/:id
// @desc     unlike a posts
// @access   Private    
router.put('/unlike/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        // check if post has been already been liked
        if (post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
            return res.status(400).json({ msg: 'Post has not yet been liked' })
        }

       // Get remove index
       const removeIndex = post.likes.map(like => like.user.toString()).indexOf(req.user.id);

       post.likes.splice(removeIndex, 1) 

        await post.save()

        res.json(post.likes)

    } catch (err) {
        console.error('err.message');
        return res.status(500).send('Server Error')
    }
})



// @route    POST api/posts/comment/:id
// @desc     Comment on a post
// @access   private

router.post('/comment/:id', [auth,[
    check('text', 'text must be required').not().isEmpty()
]], async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    try {
        // get the user that want to comment
        const user = await User.findById(req.user.id).select('-password')

        // get the post in which user want to comment
        const post = await Post.findById(req.params.id)

        const newComment = {
            text: req.body.text,
            name: user.name, 
            avatar: user.avatar,
            user: req.user.id
        }

        post.comments.unshift(newComment)

        await post.save();

        res.json(post.comments)

    } catch (err) {
        console.error(err.message)
        return res.status(500).send('Server Error')
    }
});


// :id is the post ID
// @route    DELETE api/posts/comment/:id/:comment_id  // :comment_id => because we need to find the post by the ID then we need to know which comment to delete.
// @desc     Delete Comment
// @access   private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        // Pull out comment
        const comment = post.comments.find(comment => comment.id === req.params.comment_id);

        // Make sure comment exists
        if(!comment) {
            return res.status(404).json({ msg: 'comment does not exist'})
        }

        // Check User that deleting the comment is actully that made the comment
        if(comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'user not authorize' })
        }

        // Get remove index
        const removeIndex = post.comments.map(comment => comment.user.toString()).indexOf(req.user.id);

        post.comments.splice(removeIndex, 1)

        await post.save()

        res.json(post.comments)

    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
})

module.exports = router;
