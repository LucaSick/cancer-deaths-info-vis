const createLoadNavbar = (page) => {
    fetch("/navbar.html")
        .then(res => res.text())
        .then(html => {
            document.getElementById("navbar").innerHTML = html;
            if (page == "Worldmap") {
                document.getElementById("NavWorldMap").classList.add("active");
            } else if (page == "Details") {
                document.getElementById("NavDetails").classList.add("active");
            }
        });
}

export default createLoadNavbar