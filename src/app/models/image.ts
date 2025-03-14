export interface User {
    id: number;
    login: string;
}

export interface Tag {
    name: string
}

export interface Image {
    id: number;
    filePath: string;
    date: Date;
    user: User;
    tags: Tag[]
}
