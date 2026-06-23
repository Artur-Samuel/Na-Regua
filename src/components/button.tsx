import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from "react-native"

type Props = TouchableOpacityProps & {
    label: string
}

export function Button({ label, ...rest }: Props){
    return(
        <TouchableOpacity style={styles.button} {...rest}>
            <Text style={styles.text}>{label}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    button:{
        width:"100%",
        height:48,
        backgroundColor:"#3366FF",
        borderRadius:8,
        alignItems:"center",
        justifyContent:"center",
        marginTop:10
    },
    text:{
        color:"#FFF",
        fontSize:16,
        fontWeight:"bold"
    }
})