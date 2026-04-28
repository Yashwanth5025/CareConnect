<h1>ScoutTalent</h1>
    <div >
        <img src="https://res.cloudinary.com/dhuado5jg/image/upload/v1760805592/logowithbg_yqkneu.png" alt="icon" style="height:100px;width:100px;">
    </div>
    <hr>
    <div id="Toc">
        <h2>Table of Contents</h2>
            <a href="#abstract">- Introduction</a><br>
            <a href="#req">- Requirements</a><br>
            <a href="#ins">- How to Use</a><br>
            <a href="#preview">- Preview</a><br>
            <a href="#Team">- Team</a><br>
            <a href="#cont">- Contribution</a><br>
            <a href="#improve">- Improvements</a><br>
    </div>
    <hr>
    <div id="abstract">
        <h2>Abstract</h2>
        <p>This web-based application streamlines the entire football scouting and talent management workflow. It features an objective, points-based evaluation system that helps scouts accurately assess players using performance metrics, league competitiveness, team strength, and custom scoring logic.<br>
        Scouts can easily search, filter, and compare players worldwide based on specific criteria, making talent discovery faster and more reliable.<br>
        The platform also includes a player marketplace, where agents can list their players, attract interest from clubs, and manage transfer opportunities. Once a player signs a new contract, agents can quickly update or remove their listing. Players can explore career opportunities and connect with clubs globally, ensuring transparency and accessibility throughout the football ecosystem.<br>
        Overall, this system provides a modern, data-driven approach to scouting while empowering agents, players, and clubs to collaborate more effectively. OpenAI can also be used for AI-assisted scouting analysis and agent workflows when configured through backend environment variables.</p>
    </div>
    <hr>
    <div id="req">
        <h2>Requirements</h2>
        <table style="border-collapse: collapse;">
            <tr>
                <th >Nodejs</th>
                <td >
                    <a href="https://nodejs.org/en/download">v22.20.0</a>
                </td>
            </tr>
            <tr>
                <th >Nodemon</th>
                <td >
                    <a href="https://www.npmjs.com/package/nodemon">3.1.10</a>
                </td>
            </tr>
            <tr>
                <th >Vite+React</th>
                <td >
                    <a href="https://vite.dev/guide/">v7.1.9</a>
                </td>
            </tr>
            <tr>
                <th >MongoDB</th>
                <td >
                    <a href="https://www.mongodb.com/products/self-managed/community-edition">v8.2.1</a>
                </td>
            </tr>
        </table>
    </div>
    <hr>
    <div id="ins">
        <h2>How to Use</h2>
        <ol>
            <li>Clone the repository using <br>
            <pre><code>git clone &lt;https://github.com/AAC-Open-Source-Pool/25AACR17.git&gt;</code></pre></li>
            <li>Navigate to the project directory:<br><pre><code> cd 25AACR17 <br> npm install</code></pre></li>
            <li>Install the dependencies for both frontend and backend:
                <ul>
                    <li>For frontend: <pre><code>cd ScoutTalent <br> npm install <br>cd .. </code></pre></li>
                    <li>For backend: <pre><code>cd Backend <br> npm install</code></pre></li>
                </ul>
            </li>
            <li>Set up environment variables:
                <ul></button>
                    <li>Create a .env file in the Backend directory.</li>
                    <li>Add your MongoDB connection string and any other required variables.</li>
                </ul>
            </li>
            <li>Start the development servers:
                <ul>
                    <li>Return back to the your folder consisting both ScoutTalent and Backend folders using:<br>
                    <pre><code>cd ..</code></pre>
                    </li>
                    <li>For frontend and backend: <pre><code>npm start</code></pre></li>
                </ul>
            </li>
            <li>Open your browser and navigate to the provided localhost URL to view the application.</li>
        </ol>
    </div>
    <hr>
    <div id="preview">
            <h2>Preview</h2>
            <img src="https://res.cloudinary.com/dhuado5jg/image/upload/v1760806311/0f4fc1f0-3c6d-49ec-b579-e254cb58c10b.png" alt="home page"><br>
            <img src="https://res.cloudinary.com/dhuado5jg/image/upload/v1760806709/04be8e33-11ba-45c2-a531-2ceaae9a11cc.png" alt="market page">
    </div>
    <hr>
    <div id="Team">
        <h2>Team Details</h2>
        <p>Team Number: <br>25AACR17</p>
        <p>Senior Mentor: <br>Vaishnavi Addla</p>
        <p>Junior Mentor: <br>Dheeraj Chandra</p>
        <p>Team Member 1: <br>Sai Sathwik</p>
        <p>Team Member 2: <br>Chandu Chethan</p>
        <p>Team Member 3: <br>Divya</p>
        <p>Team Member 4: <br>Anvitha</p>
    </div>
    <hr>
    <div id="cont">
        <h2>Contribution</h2>
          <strong>This section provides instructions and details on how to submit a contribution via a pull request. It is important to follow these guidelines to make sure your pull request is accepted.</strong> 
        <br>
            1. Before choosing to propose changes to this project, it is advisable to go through the readme.md file of the project to get the philosophy and the motive that went behind this project. The pull request should align with the philosophy and the motive of the original poster of this project. <br>
            2. To add your changes, make sure that the programming language in which you are proposing the changes should be the same as the programming language that has been used in the project. The versions of the programming language and the libraries(if any) used should also match with the original code. <br>
            3. Write a documentation on the changes that you are proposing. The documentation should include the problems you have noticed in the code(if any), the changes you would like to propose, the reason for these changes, and sample test cases. Remember that the topics in the documentation are strictly not limited to the topics aforementioned, but are just an inclusion. <br>
            4. Submit a pull request via <a href="https://gist.github.com/mikepea/863f63d6e37281e329f8">Git etiquette</a>
        <br>
    </div>
    <hr>
    <div id="improve">
        <h2>Improvements</h2>
        <ul>
            <li>Along with Scouts,Players and Agents we can also include pages for clubs like Barcelona to manage their scouts and transfers</li>
            <li>Also if we include pages for clubs, we can include pages for club health department. For example, if someone gets injured, his club department informs everyone via website</li>
            <li>You can integrate this with ML-Ops in such a way that you can render the stats of players from the match recordings</li>
            <li>Along with goals, assists, you can also show other important details like offball movements, if we integrate it with ML-Ops</li>
            <li>You can also show player behavior using red and yellow backgrounds in market page</li>
        </ul>
    </div>
