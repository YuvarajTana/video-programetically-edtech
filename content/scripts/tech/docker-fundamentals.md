# What Is Docker? The Problem It Solves—with a Real Example

- Series: Software Foundations for AI Engineers
- Runtime: exactly 5:00 at 30 FPS
- Delivery: YouTube 16:9
- Audience: beginners learning software and AI engineering
- Narration speed: 1×
- Learning objective: understand environment drift, distinguish images from containers, trace Docker’s runtime behavior, and run a practical FastAPI plus MySQL application with Compose.
- Background music: “Quiet Circuit Ambient,” mixed beneath narration with ducking and five-second fades.

## Timed narration and scenes

| # | Time | Length | Scene | Visual direction | Exact narration |
| --- | --- | ---: | --- | --- | --- |
| 1 | 0:00–0:03 | 3s | Title | Open on the familiar “works on my machine” claim, then split the frame as a second laptop fails. | Works here. Fails on another machine. |
| 2 | 0:03–0:29 | 26s | Compare | Contrast a configured development laptop with another machine missing the exact runtime, native library, database settings, and environment variables. | Imagine a FastAPI service that needs a specific Python version, exact packages, a system library, environment variables, and MySQL. On your laptop, every piece is installed. On a teammate’s laptop, Python is older, one library is missing, and the database uses different settings. The code is identical, but the environment is not. That mismatch causes slow setup, unpredictable bugs, and failed deployments. |
| 3 | 0:29–0:53 | 24s | Flow | Turn application files and a Dockerfile into an image, move it through a registry, then start an isolated container. | Docker is a platform for building, shipping, and running applications in containers. You describe the environment as code, build it into a standardized image, and start that image as an isolated process. The image carries the app, runtime, libraries, and configuration files it needs. The container still uses the host operating system’s kernel; Docker is not packaging an entire computer. |
| 4 | 0:53–1:18 | 25s | Architecture | Trace a command from the developer through the Docker client and daemon, then show the daemon pulling an image and starting a container. | When you type a Docker command, the client sends an API request to the Docker daemon. The daemon builds images and manages containers, networks, and volumes. If an image is missing, Docker can pull it from a registry such as Docker Hub. At runtime, the daemon creates the isolated process, attaches storage and networking, and starts the image’s default command. |
| 5 | 1:18–1:42 | 24s | Motion canvas | Animate one immutable, layered image branching into two live containers, each with a writable layer, both able to mount persistent storage. | An image and a container are related, but different. The image is an immutable, layered package: a reusable blueprint. A container is one running instance, with runtime settings and a writable layer. Many containers can start from one image. Remove a container, and changes outside persistent storage disappear. The original image remains unchanged and reusable. |
| 6 | 1:42–2:07 | 25s | Compare | Compare the container process and shared kernel with a virtual machine’s application, libraries, and full guest operating system. | A virtual machine includes a full guest operating system above a hypervisor. A container usually runs as an isolated process while sharing the host kernel. That often reduces startup time and overhead, but it is not magic. Containers must match a supported kernel and architecture. On macOS or Windows, Docker Desktop uses a Linux virtual machine behind the scenes to run Linux containers. |
| 7 | 2:07–2:35 | 28s | Code | Build a Python Dockerfile line by line: base image, working directory, dependency layer, app source, non-root user, and startup command. | A Dockerfile is the recipe for an image. FROM selects a Python base image. WORKDIR sets the directory for later instructions. COPY brings in the dependency file. RUN installs packages while the image is being built. A second COPY adds the application code. USER avoids running the app as root, and CMD declares what starts when a container runs. Docker caches unchanged layers, so later builds can reuse earlier work. |
| 8 | 2:35–2:59 | 24s | Terminal | Run `docker build`, then `docker run`; animate the daemon adding the writable layer, port mapping, and container process. | Docker build reads the Dockerfile and produces an image. Docker run asks the daemon to create a container from it. If needed, Docker pulls missing layers, adds a writable filesystem, configures networking, publishes requested ports, attaches volumes, and starts the command. The app is now a normal process inside its isolated environment. When that main process stops, the container stops too. |
| 9 | 2:59–3:26 | 27s | Architecture | Introduce the real application: browser to FastAPI container, FastAPI to MySQL container through a Compose network, and MySQL to a named volume. | Now apply Docker to a real project: a FastAPI order service with MySQL. Without Docker, each developer installs Python, compilers, database software, users, passwords, and ports by hand. With Docker, the API gets its own image, MySQL uses its official image, and a Compose file declares how the services connect. The repository now includes an executable description of the application environment. |
| 10 | 3:26–3:56 | 30s | Code | Reveal `compose.yaml` by service: build and publish the API, address MySQL by service name, then mount the database volume. | In compose dot yaml, the API builds from the Dockerfile and publishes port eight thousand. Its database URL uses the service name D B, because Compose creates a network where services can discover one another. MySQL runs from its image and stores data in a named volume that outlives the container. One command, docker compose up dash dash build, builds the API, creates resources, starts both services, and streams their logs. |
| 11 | 3:56–4:23 | 27s | Flow | Move the image from local development to CI testing, a registry, and a production server without rebuilding it there. | The same image can move through delivery. A developer builds and tests it locally. Continuous integration rebuilds from the Dockerfile, runs tests, tags the image, and pushes it to a registry. A server then pulls that exact image and supplies production configuration at startup. Docker reduces environment drift because testing and deployment use the same packaged application, instead of repeating a long manual installation checklist. |
| 12 | 4:23–4:51 | 28s | Steps | Separate Docker’s benefits from operational responsibilities: repeatability, isolation, persistence, security, secrets, backups, and health. | Docker provides repeatable environments, dependency isolation, faster onboarding, and a consistent delivery unit. It does not secure applications automatically, back up databases, or manage secrets. Pin image versions, scan and update dependencies, run with least privilege, store durable data in volumes, and inject configuration safely. Docker makes the environment explicit and reproducible; disciplined operations make it reliable. |
| 13 | 4:51–5:00 | 9s | Outro | Collapse the whole lesson into Dockerfile to image, image plus configuration to container, and Compose to application. | Docker turns “works on my machine” into “run this image.” Build once, configure at runtime, and ship with confidence. |

## Primary sources

- [Docker Docs — What is Docker?](https://docs.docker.com/get-started/docker-overview/)
- [Docker Docs — What is an image?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)
- [Docker Docs — Writing a Dockerfile](https://docs.docker.com/get-started/docker-concepts/building-images/writing-a-dockerfile/)
- [Docker Docs — What is Docker Compose?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-docker-compose/)
- [Docker Docs — How Compose works](https://docs.docker.com/compose/intro/compose-application-model/)

## Production commands

```bash
npm run typecheck
npm run validate -- tech/docker-fundamentals
npm run voice -- tech/docker-fundamentals --speed 1 --force
npm run render -- tech/docker-fundamentals --profile landscape
npm run media:qa -- out/tech/docker-fundamentals/youtube-long/video.mp4 --expected 300 --require-audio
```
