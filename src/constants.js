const SECRET_KEY = "NODEWORKZ@123";
const RESETPASSLINK = 'http://localhost:3000/forgot';
const cfprivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAptGWTFfV2NL8m3UU5F3L0aoN25p30NGzzFIwyES7PSObNtrm
JPkF7RHqdkrrpevsdWAGtZgtKlyLQkq859R22plpfRV6I6+pnnjmmyViZuks4oyH
pwpZwBDTcKuVZWC9L9rg1vo10zQZfiKi7oIR2dSUJxjDEZ4bzhxHtpLZKxVIr+I7
QL/kn/WrsRUByHNEHADCfmkkVi9T0rq8uMGCaWBMbp87608aXacxk9UHbEmTya29
ngcAUALsZnxjlA6VCr1Bh2jHKhmCIELdmeeSuKExuCuqcP7oMgoWMSy9q/VoGAHV
8cMEkibxfvDgay/lHsjyjuqabWkFSZVfUloB8wIDAQABAoIBAQCcsB4BJTt6xmp4
xldSTPulupn7nDJQVLgSAV1KrqxEOA6RTrh/H9w+GeblJ2gB2ACpGwISTZaWxIgV
Q0f+ZSUiHJjl4Wdw341tiVfpgArWaMw9GwxLjMBSVDuWB8RyjZQFwAwSQMCP2c7c
GEJ7znZf6Xki4/JNuPma9hsx1OrguD4s2pw53/XKDvj+wmMwg5ydAxh92IYboPhb
3R2RQXBV/00T1//sfSxsrQ/oiD/T+p8xzUYUAXB4NxGQz6hoPHxGStZVVMhpDRYU
uMiykMWTZeT1CV3iZQiLomvJuJxEjBAa3O2m9dEwFkphTuVTRc4BBf3d71YUgj5C
5MwS+dKZAoGBAONQUxTGAsHW9GoUF46haWiwZlZsqEFQlW4qqo5oVuh9Bw8A879v
vAQ8RqvPzMArAKJHj+rORbzzWo0BBJ3hnbBGp+ps4YHX+qT7qpUUGUFEw6to38Ov
ftz0QeF34AjwcchVnKLbDB51e/i4+eh86t/XyytM1EQlmQ6pAdtsYs01AoGBALve
43CAzS6FZatFgDnaixgDzEVdN9CPgUCeB8QXAT/Z7UY/nZa0q2pcvbrnXDidgvg8
QHMgPK0XWZYJ5C1qqET1bSqN7uMVY2hjDS4FjWhpjtkV8z7cIyVklmQGWvumo9j0
dUqxucN9pdm0eM1LaIshp3OXwKAMjIJsR50zeP+HAoGABIejQDS59VbtQ/fmiEcb
LKTnRS2hJLwQXkOnZnMZ2EQ1kcz5DoWRf5wb5Gydre6tco5uhcVaimtnEIxGpUbL
t6mQyxEkZUwCiKsjORlPb4eJRq8uVl327zxG29Fhu4vfGJjsKCqpUSoSMGCvSjzD
CXbpa5F6YWlGZY5kpRTB20kCgYEAhFo/7NAwvKdpusFZ1mgqOZ7jV7KWUa3npvgu
DG0QikUjLaw/fx6E7IetenDnvVLqI6t+1BxP4rlieZs6Tuym4v3sDGC1fPFiePXf
IR70QiyrYDBgj1ZSxFMayBjaHBOHtp5xy09tyVVJdBf6StbnLa1l5L9yCs8MZg2W
Xh8XDR0CgYAYM7Yus6XR1r3mIjaWgj0/hOFhX08LG56QqsVbjFEpb3/jkSJevkVP
fDKlGEtS1dBxwAYZ0pAM6XmnlpQdEt394lb+d1QaBZxzrMj3i4aNiWjlSWqJutxv
TNu8kIIfvX1D8tvmQoABHGp5ZIeEfhK7V8G4Oii6OYfdX8XrG/b7Vg==
-----END RSA PRIVATE KEY-----`

const cfpublickey = 'APKAIMZUNS62HHFBQPHQ'; // cloud front public key
const cfurl = 'https://cdn.workforcez.net/'; // cloud front URL
const sitedomain = 'workforcez.net';
const cfdomain = 'cdn.workforcez.net';
const cookieexpiry = 180;
const CDN_URL = 'https://cdn.workforcez.net';
module.exports = {
    SECRET_KEY, RESETPASSLINK, cfprivateKey, cfpublickey, cfurl, sitedomain, cfdomain, cookieexpiry, CDN_URL
}