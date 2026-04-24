## v0.0.1 🎉

- (Auth Module) Login and and signup with bearer token
    - login, logout, forget password, resent code, reset password
    - High securily password reseting using redis in-memoery database
- (Post Module) Creating a new post with author reference of user and also post metadata, like location, gif, and category
- (Category Module) Creating a new category for assign the category id to the post (optional)
- (Choice Module) When a user create their account they can be select their choice, it's a multiple choice
- (CI/CD intregation) for continous deployment

# **Change Code Structure**

## v0.1.5 🎉

- (Post Like) handled post like to post (non-tested)
- (Post Comment) handle indevisual post comments with nested (non-tested)
- (Community module)
- (NGO module)

## v0.1.9 🎉 **(Implementing socket)**

- **🏗 Architecture Of Shared Socket Module**
    1. **Global Socket Module**
    - Provides a SocketService that can be injected anywhere.
    - Configurable with Redis adapter for horizontal scaling.
    - Typed event contracts for safety.
    2. **Event Bus Pattern**
    - Define a shared event map (SocketEvents) so all socket events are strongly typed.
    - Chat, Notification, etc. modules will publish/subscribe via this bus.
    3. **Prisma Integration**
    - Use Prisma inside event handlers (e.g., when storing messages/notifications).

- (Notificaiton Module)

## v1.6.0 (joy)

- ngo verification complete
