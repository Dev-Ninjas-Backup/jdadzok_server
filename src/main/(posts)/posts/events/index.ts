export interface PostEvent<T = any> {
    "post:new": {
        userId: string;
        post: T;
    };
    "post_tag:new": {
        userId: string;
        taggedUserId: string[];
    };
}
